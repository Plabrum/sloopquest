from typing import Any

from advanced_alchemy.extensions.litestar import (
    AsyncSessionConfig,
    SQLAlchemyAsyncConfig,
    SQLAlchemyPlugin,
)
from litestar import Litestar
from litestar.channels import ChannelsPlugin
from litestar.channels.backends.memory import MemoryChannelsBackend
from litestar.config.cors import CORSConfig
from litestar.connection import ASGIConnection
from litestar.contrib.jinja import JinjaTemplateEngine
from litestar.middleware.session.base import ONE_DAY_IN_SECONDS
from litestar.middleware.session.server_side import ServerSideSessionConfig
from litestar.security.session_auth import SessionAuth
from litestar.stores.base import Store
from litestar.stores.memory import MemoryStore
from litestar.stores.redis import RedisStore
from litestar.template.config import TemplateConfig
from litestar_saq import SAQConfig, SAQPlugin
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import Config
from app.demo.routes import demo_router
from app.domain.calendar_events.routes import calendar_event_router
from app.domain.clients.routes import client_router
from app.domain.inbox.routes import email_thread_router, message_router
from app.domain.invoices.public_routes import public_invoice_router
from app.domain.invoices.routes import invoice_router
from app.domain.manufacturers.routes import manufacturer_router
from app.domain.parts.routes import part_router
from app.domain.payment_methods.routes import payment_method_router
from app.domain.pricing_guides.routes import pricing_guides_router
from app.domain.reports.routes import report_router
from app.domain.subscriptions.routes import subscription_router
from app.domain.surveys.routes import survey_router, survey_template_router
from app.domain.users.models import User
from app.domain.users.queries import get_user_by_id
from app.domain.users.routes import user_router
from app.domain.vessels.routes import vessel_router
from app.platform.actions.routes import action_router
from app.platform.auth.routes import auth_router
from app.platform.base.models import BaseDBModel
from app.platform.base.schema_routes import schema_router
from app.platform.base.search_routes import search_router
from app.platform.base.soft_delete import install_soft_delete_filter
from app.platform.billing import billing_router, billing_webhook_router, connect_router
from app.platform.comms.webhook_routes import comms_webhook_router
from app.platform.dashboard.routes import dashboard_router
from app.platform.documents import document_router
from app.platform.llm.routes import llm_router
from app.platform.media import local_files_router, media_router
from app.platform.queue.config import queue_config
from app.platform.threads import thread_handler, thread_router
from app.utils.deps import get_dependencies
from app.utils.discovery import discover_and_import
from app.utils.sqids import Sqid, SqidSchemaPlugin, sqid_dec_hook, sqid_enc_hook, sqid_type_predicate

# Trigger SQLAlchemy mapper registration across all model files
discover_and_import(["models.py", "models/**/*.py"], base_path="app")
# Trigger @dep registration across all deps.py files
discover_and_import(["deps.py"], base_path="app")
# Trigger Tool.__init_subclass__ registration across all domain tools.py files
discover_and_import(["tools.py"], base_path="app")
# Trigger action group registration across all domain action files
discover_and_import(["actions.py"], base_path="app/domain")

install_soft_delete_filter()

__all__ = ["BaseDBModel", "create_app"]


def create_app(
    config: Config,
    *,
    dependencies_overrides: dict[str, Any] | None = None,
    plugins_overrides: list[Any] | None = None,
    stores_overrides: dict[str, Store] | None = None,
    retrieve_user_handler_override: Any = None,
) -> Litestar:
    """Create and configure the Litestar application."""

    cors_config = CORSConfig(
        allow_origins=[config.FRONTEND_ORIGIN],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    # Engine is created explicitly so retrieve_user_handler can share the pool.
    engine = create_async_engine(config.ASYNC_DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)

    sqlalchemy_plugin = SQLAlchemyPlugin(
        config=SQLAlchemyAsyncConfig(
            engine_instance=engine,
            metadata=BaseDBModel.metadata,
            session_config=AsyncSessionConfig(expire_on_commit=False, autoflush=False),
            create_all=False,
        )
    )

    template_config = TemplateConfig(
        directory=config.EMAIL_TEMPLATES_DIR,
        engine=JinjaTemplateEngine,
    )

    saq_config = SAQConfig(
        queue_configs=queue_config,
        web_enabled=config.IS_DEV,
        use_server_lifespan=True,
    )
    saq_plugin = SAQPlugin(config=saq_config)

    async def _setup_task_queues(app: Litestar) -> None:
        app.state.task_queues = saq_config.get_queues()

    channels_plugin = ChannelsPlugin(
        backend=MemoryChannelsBackend(),
        arbitrary_channels_allowed=True,
    )

    async def retrieve_user_handler(session: dict, _conn: ASGIConnection) -> User | None:
        user_id = session.get("user_id")
        if not user_id:
            return None

        async with session_factory() as db:
            return await get_user_by_id(db, user_id)

    stores: dict[str, Store] = {
        "sessions": RedisStore.with_client(url=config.REDIS_URL),
        "viewers": MemoryStore(),
    }
    if stores_overrides:
        stores.update(stores_overrides)

    session_auth = SessionAuth[User, Any](
        retrieve_user_handler=retrieve_user_handler_override or retrieve_user_handler,
        session_backend_config=ServerSideSessionConfig(
            store="sessions",
            samesite="lax",
            secure=not config.IS_DEV,
            httponly=True,
            max_age=ONE_DAY_IN_SECONDS * 14,
        ),
        exclude=[
            "^/health",
            "^/auth/magic-link/",
            "^/auth/logout",
            "^/schema",
            "^/webhooks/",
        ],
    )

    default_plugins: list[Any] = [sqlalchemy_plugin, saq_plugin, channels_plugin, SqidSchemaPlugin()]
    plugins = plugins_overrides if plugins_overrides is not None else default_plugins

    deps = {**get_dependencies(), **(dependencies_overrides or {})}

    on_startup: list[Any] = []
    if plugins_overrides is None:
        on_startup.append(_setup_task_queues)

    return Litestar(
        route_handlers=[
            schema_router,
            auth_router,
            demo_router,
            action_router,
            comms_webhook_router,
            email_thread_router,
            message_router,
            billing_webhook_router,
            thread_router,
            thread_handler,
            media_router,
            document_router,
            local_files_router,
            dashboard_router,
            vessel_router,
            manufacturer_router,
            part_router,
            client_router,
            survey_router,
            survey_template_router,
            invoice_router,
            public_invoice_router,
            calendar_event_router,
            payment_method_router,
            pricing_guides_router,
            report_router,
            subscription_router,
            user_router,
            billing_router,
            connect_router,
            llm_router,
            search_router,
        ],
        plugins=plugins,
        on_app_init=[session_auth.on_app_init],
        stores=stores,
        cors_config=cors_config,
        template_config=template_config,
        dependencies=deps,
        on_startup=on_startup,
        type_encoders={Sqid: sqid_enc_hook},
        type_decoders=[(sqid_type_predicate, sqid_dec_hook)],
        debug=config.IS_DEV,
    )
