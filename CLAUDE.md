# Sloopquest — Claude Code Guidelines

## Comments

**Keep a comment when:**
- The code does something surprising or counter-intuitive
- There's a constraint not visible in the code (a workaround for an external bug, a compliance requirement, a performance trap)
- A TODO has a genuine open question or domain decision still pending

**Delete a comment when:**
- It restates what the function or class name already says
- It labels a block of code that does exactly what it says (`# Search`, `# Paginate`)
- It's a decorative section header (`# ─── Section ───`)
- It explains *what* the code does rather than *why*

**Docstrings:**
- Public API methods: include only if they explain params or non-obvious behavior, not if they repeat the name
- Internal helpers and guards: usually no docstring needed; the name should be enough
- Exception classes: skip the docstring unless the semantics are subtle

## Backend Hard Rules

- **Inject `transaction`, never `db_session`.** `transaction` wraps with RLS, soft-delete listener, and raiseload safety. `db_session` bypasses all three.
- **Raiseload blocks lazy loads.** Relationships accessed in CRUD mappers need `lazy="noload"` + explicit `joinedload()` in the CRUD config. `lazy="joined"` on the model is overridden by session-level raiseload → silent 500s.
- **No field name shadowing in msgspec Structs.** Never name a field the same as its type import (`date: date`, `type: str`). Python 3.14 CI resolves annotations differently from 3.13 local — silent 500s on action endpoints.
- **Top-level endpoints only.** Never nested list routes. Use parent ID in `filterable_columns`; RLS handles access control.
- **State transitions through `StateMachineService` only.** Never assign `obj.state = ...` directly.
- **msgspec** (`BaseSchema(Struct)`), not Pydantic.
- **`advanced_alchemy.extensions.litestar`**, not `litestar.plugins.sqlalchemy`.

## Schemas

- **Enums:** use `TextEnum` for enum fields, not `sa.Enum()`. Stored as TEXT — no ALTER TYPE migrations when values change.
- **Update schemas are declarative.** All fields required, no `UNSET`/`UnsetType`. Fields that can be null are typed `T | None`.

## Code Style

**Python:**
- `T | None` over `Optional[T]`
- `datetime.now(tz=timezone.utc)` not `datetime.utcnow()` (deprecated)
- 4-space indents, snake_case for modules/functions/variables, PascalCase for classes
