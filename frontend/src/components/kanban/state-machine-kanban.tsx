import { useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import {
  KanbanProvider,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
} from "@/components/ui/kanban";
import { humanize } from "@/lib/utils";
import type { ActionDTO, ActionGroupType } from "@/openapi/litestarAPI.schemas";

type Row = { actions?: ActionDTO[] };

type KanbanItem<TRow extends Row> = {
  id: string;
  name: string;
  column: string;
  row: TRow;
};

type ExecuteInput = {
  actionGroup: ActionGroupType;
  objectId: string;
  action: string;
};

export type StateMachineKanbanProps<TRow extends Row, TState extends string> = {
  rows: TRow[];
  getId: (row: TRow) => string;
  getName: (row: TRow) => string;
  getState: (row: TRow) => TState;
  renderCard: (row: TRow) => ReactNode;

  states: readonly TState[];
  getStateLabel?: (state: TState) => string;

  actionGroup: ActionGroupType;
  executeAction: (input: ExecuteInput) => Promise<unknown>;

  // Caller owns its cache; these let the kanban drive optimistic moves
  // without knowing the query-key shape.
  onOptimisticMove?: (rowId: string, toState: TState) => void;
  onRollback?: () => void;
  onSettled?: () => void;
};

export function StateMachineKanban<TRow extends Row, TState extends string>({
  rows,
  getId,
  getName,
  getState,
  renderCard,
  states,
  getStateLabel = humanize,
  actionGroup,
  executeAction,
  onOptimisticMove,
  onRollback,
  onSettled,
}: StateMachineKanbanProps<TRow, TState>) {
  const columns = useMemo(
    () => states.map((s) => ({ id: s, name: getStateLabel(s) })),
    [states, getStateLabel],
  );

  const items: KanbanItem<TRow>[] = useMemo(
    () =>
      rows.map((row) => ({
        id: getId(row),
        name: getName(row),
        column: getState(row),
        row,
      })),
    [rows, getId, getName, getState],
  );

  const handleDataChange = async (updated: KanbanItem<TRow>[]) => {
    const moves = updated
      .map((next) => {
        const prev = items.find((i) => i.id === next.id);
        return prev && prev.column !== next.column
          ? { id: next.id, fromState: prev.column, toState: next.column, row: prev.row }
          : null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (moves.length === 0) return;

    // A drop is valid iff the row's available actions include one whose
    // target_state matches the destination column. The backend re-checks
    // on execute — this is just optimistic gating.
    const planned = moves.map((m) => {
      const action = (m.row.actions ?? []).find(
        (a) => a.target_state === m.toState,
      );
      return { ...m, action };
    });

    const blocked = planned.find((p) => !p.action);
    if (blocked) {
      toast.error(
        `Can't move to ${getStateLabel(blocked.toState as TState)} from here`,
      );
      return;
    }

    for (const p of planned) {
      onOptimisticMove?.(p.id, p.toState as TState);
    }

    try {
      await Promise.all(
        planned.map((p) =>
          executeAction({
            actionGroup,
            objectId: p.id,
            action: p.action!.action,
          }),
        ),
      );
    } catch (err) {
      onRollback?.();
      const message = err instanceof Error ? err.message : "Failed to update";
      toast.error(message);
    } finally {
      onSettled?.();
    }
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <KanbanProvider
        columns={columns}
        data={items}
        onDataChange={handleDataChange}
      >
        {(column) => (
          <div className="bg-muted/50 flex h-full min-h-0 min-w-[220px] flex-col rounded-lg border">
            <KanbanHeader className="shrink-0 border-b p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="bg-primary h-1.5 w-1.5 rounded-full" />
                  <h3 className="text-sm font-semibold">{column.name}</h3>
                </div>
                <span className="bg-background rounded-full px-1.5 py-0.5 text-xs font-medium">
                  {items.filter((i) => i.column === column.id).length}
                </span>
              </div>
            </KanbanHeader>
            <KanbanCards
              id={column.id}
              className="min-h-0 flex-1 space-y-1.5 p-2"
            >
              {(item) => (
                <KanbanCard key={item.id} {...item}>
                  {renderCard((item as KanbanItem<TRow>).row)}
                </KanbanCard>
              )}
            </KanbanCards>
          </div>
        )}
      </KanbanProvider>
    </div>
  );
}
