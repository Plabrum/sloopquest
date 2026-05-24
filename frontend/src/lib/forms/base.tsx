import * as React from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  useForm,
  FormProvider,
  useFormContext,
  Controller,
  type FieldValues,
  type Path,
  type RegisterOptions,
  type SubmitHandler,
  type DefaultValues,
  type UseFormProps,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { EntityCombobox } from "@/lib/forms/entity-combobox";
import { cn } from "@/lib/utils";

export interface FormDateRangeValue {
  startDate: string | undefined;
  endDate: string | undefined;
}

type BaseFieldProps<
  TFieldValues extends FieldValues,
  N extends Path<TFieldValues>,
> = {
  name: N;
  label?: string;
  placeholder?: string;
  required?: boolean | string;
  className?: string;
  rules?: RegisterOptions<TFieldValues, N>;
  description?: string;
  id?: string;
};

function requiredMessage(required?: boolean | string) {
  if (!required) return undefined;
  return typeof required === "string" ? required : "This field is required";
}

/** Parse a field value that may be a Date, ISO string, or falsy into a Date. */
function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    // Date-only strings (yyyy-MM-dd): parse as local noon to avoid
    // timezone-related off-by-one shifts at midnight boundaries.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }
    return parseISO(value);
  }
  return undefined;
}

// eslint-disable-next-line react-refresh/only-export-components
function FieldError({ name }: { name: string }) {
  const {
    formState: { errors },
  } = useFormContext();
  const err = errors?.[name] as { message?: string } | undefined;
  if (!err) return null;
  return (
    <p className="text-destructive mt-1 text-sm">
      {String(err.message ?? "Invalid value")}
    </p>
  );
}

export function createTypedForm<TFieldValues extends FieldValues>() {
  type Name<N extends Path<TFieldValues>> = N;

  function Form(props: {
    defaultValues?: DefaultValues<TFieldValues>;
    onSubmit: SubmitHandler<TFieldValues>;
    className?: string;
    children: React.ReactNode;
    mode?: UseFormProps<TFieldValues>["mode"];
    resolver?: UseFormProps<TFieldValues>["resolver"];
  }) {
    const {
      defaultValues,
      onSubmit,
      className,
      children,
      mode = "onSubmit",
      resolver,
    } = props;
    const methods = useForm<TFieldValues>({
      defaultValues,
      mode,
      reValidateMode: "onChange",
      resolver,
    });

    return (
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className={cn("space-y-4", className)}
        >
          {children}
          <button type="submit" className="hidden" />
        </form>
      </FormProvider>
    );
  }

  function FormString<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N> & {
      type?: React.ComponentProps<"input">["type"];
      autoFocus?: boolean;
    },
  ) {
    const {
      name,
      label,
      placeholder,
      required,
      className,
      rules,
      description,
      id,
      autoFocus,
      type,
    } = props;
    const { register } = useFormContext<TFieldValues>();
    const htmlId = id ?? String(name);

    return (
      <div className={className}>
        {label && (
          <Label htmlFor={htmlId}>
            {label} {required ? "*" : null}
          </Label>
        )}
        <Input
          id={htmlId}
          type={type ?? "text"}
          autoFocus={autoFocus}
          {...register(name, {
            required: requiredMessage(required),
            ...rules,
          })}
          className="mt-1"
          placeholder={placeholder}
        />
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
        <FieldError name={String(name)} />
      </div>
    );
  }

  function FormEmail<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N>,
  ) {
    const {
      name,
      label,
      placeholder,
      required,
      className,
      rules,
      description,
      id,
    } = props;
    const { register } = useFormContext<TFieldValues>();
    const htmlId = id ?? String(name);

    const defaultEmailPattern = {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: "Invalid email address",
    };

    return (
      <div className={className}>
        {label && (
          <Label htmlFor={htmlId}>
            {label} {required ? "*" : null}
          </Label>
        )}
        <Input
          id={htmlId}
          type="email"
          {...register(name, {
            required: requiredMessage(required),
            pattern: rules?.pattern || defaultEmailPattern,
            ...rules,
          } as RegisterOptions<TFieldValues, N>)}
          className="mt-1"
          placeholder={placeholder}
        />
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
        <FieldError name={String(name)} />
      </div>
    );
  }

  function FormNumber<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N> & {
      min?: number;
      max?: number;
      step?: number;
    },
  ) {
    const {
      name,
      label,
      placeholder,
      required,
      className,
      rules,
      description,
      id,
      min,
      max,
      step,
    } = props;
    const { register } = useFormContext<TFieldValues>();
    const htmlId = id ?? String(name);

    return (
      <div className={className}>
        {label && (
          <Label htmlFor={htmlId}>
            {label} {required ? "*" : null}
          </Label>
        )}
        <Input
          id={htmlId}
          type="number"
          min={min}
          max={max}
          step={step}
          {...register(name, {
            required: requiredMessage(required),
            valueAsNumber: true,
            ...rules,
          } as RegisterOptions<TFieldValues, N>)}
          className="mt-1"
          placeholder={placeholder}
        />
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
        <FieldError name={String(name)} />
      </div>
    );
  }

  function FormText<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N> & { rows?: number },
  ) {
    const {
      name,
      label,
      placeholder,
      required,
      className,
      rules,
      rows = 3,
      description,
      id,
    } = props;
    const { register } = useFormContext<TFieldValues>();
    const htmlId = id ?? String(name);

    return (
      <div className={className}>
        {label && (
          <Label htmlFor={htmlId}>
            {label} {required ? "*" : null}
          </Label>
        )}
        <Textarea
          id={htmlId}
          {...register(name, {
            required: requiredMessage(required),
            ...rules,
          })}
          className="mt-1 resize-y"
          placeholder={placeholder}
          rows={rows}
        />
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
        <FieldError name={String(name)} />
      </div>
    );
  }

  function FormSelect<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N> & {
      options: Array<{ value: string; label: string }>;
    },
  ) {
    const {
      name,
      label,
      placeholder,
      required,
      className,
      description,
      id,
      options,
    } = props;
    const { control } = useFormContext<TFieldValues>();
    const htmlId = id ?? String(name);

    return (
      <div className={className}>
        {label && (
          <Label htmlFor={htmlId}>
            {label} {required ? "*" : null}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          rules={{ required: requiredMessage(required) }}
          render={({ field }) => (
            <Select
              value={field.value as string | undefined}
              onValueChange={field.onChange}
            >
              <SelectTrigger id={htmlId} className="mt-1 w-full">
                <SelectValue placeholder={placeholder ?? "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
        <FieldError name={String(name)} />
      </div>
    );
  }

  function FormDatetime<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N> & {
      includeTime?: boolean;
      /** Enable year/month dropdown navigation (useful for DOB fields). */
      yearNavigation?: boolean;
    },
  ) {
    const {
      name,
      label,
      placeholder,
      required,
      className,
      description,
      id,
      includeTime = false,
      yearNavigation: yearNavigationProp,
    } = props;
    // Auto-enable year navigation for date-of-birth fields
    const yearNavigation =
      yearNavigationProp ?? /\bdob\b|date_of_birth/i.test(String(name));
    const { control } = useFormContext<TFieldValues>();
    const htmlId = id ?? String(name);

    return (
      <div className={className}>
        {label && (
          <Label htmlFor={htmlId}>
            {label} {required ? "*" : null}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          rules={{ required: requiredMessage(required) }}
          render={({ field }) => {
            const dateValue = toDate(field.value);

            return (
              <div className="flex flex-col gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id={htmlId}
                      variant="outline"
                      className={cn(
                        "mt-1 w-full justify-start text-left font-normal",
                        !dateValue && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateValue
                        ? format(dateValue, includeTime ? "PPP p" : "PPP")
                        : (placeholder ?? "Pick a date")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateValue}
                      onSelect={(date) => {
                        if (!date) {
                          field.onChange(undefined);
                          return;
                        }
                        if (includeTime) {
                          field.onChange(date.toISOString());
                        } else {
                          // Normalize to local noon to avoid timezone off-by-one,
                          // then format as date-only string
                          const local = new Date(
                            date.getFullYear(),
                            date.getMonth(),
                            date.getDate(),
                            12,
                            0,
                            0,
                          );
                          field.onChange(format(local, "yyyy-MM-dd"));
                        }
                      }}
                      defaultMonth={dateValue}
                      {...(yearNavigation && {
                        captionLayout: "dropdown" as const,
                        fromYear: 1920,
                        toYear: new Date().getFullYear(),
                      })}
                    />
                    {includeTime && dateValue && (
                      <div className="border-t p-3">
                        <Input
                          type="time"
                          value={format(dateValue, "HH:mm")}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value
                              .split(":")
                              .map(Number);
                            const updated = new Date(dateValue);
                            updated.setHours(hours, minutes);
                            field.onChange(updated.toISOString());
                          }}
                        />
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            );
          }}
        />
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
        <FieldError name={String(name)} />
      </div>
    );
  }

  function FormTime<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N>,
  ) {
    const { name, label, placeholder, required, className, description, id } =
      props;
    const { control } = useFormContext<TFieldValues>();
    const htmlId = id ?? String(name);

    return (
      <div className={className}>
        {label && (
          <Label htmlFor={htmlId}>
            {label} {required ? "*" : null}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          rules={{ required: requiredMessage(required) }}
          render={({ field }) => (
            <Input
              id={htmlId}
              type="time"
              placeholder={placeholder ?? "HH:MM"}
              className="mt-1"
              value={field.value ? String(field.value).substring(0, 5) : ""}
              onChange={(e) => {
                // Store as HH:MM:SS (RFC 3339) so the backend can parse it
                const v = e.target.value;
                field.onChange(v.length === 5 ? `${v}:00` : v);
              }}
            />
          )}
        />
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
        <FieldError name={String(name)} />
      </div>
    );
  }

  function FormDateRange<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N>,
  ) {
    const { name, label, placeholder, required, className, description, id } = props;
    const { control } = useFormContext<TFieldValues>();
    const htmlId = id ?? String(name);

    return (
      <div className={className}>
        {label && (
          <Label htmlFor={htmlId}>
            {label} {required ? "*" : null}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          rules={{
            required: requiredMessage(required),
            validate: (v) => {
              if (!required) return true;
              const range = v as FormDateRangeValue | undefined;
              return (range?.startDate && range?.endDate) || requiredMessage(required) || true;
            },
          }}
          render={({ field }) => {
            const range = (field.value ?? { startDate: undefined, endDate: undefined }) as FormDateRangeValue;
            return (
              <div className="mt-1">
                <DateRangePicker
                  startDate={range.startDate}
                  endDate={range.endDate}
                  onChange={(next) => field.onChange(next)}
                  placeholder={placeholder}
                />
              </div>
            );
          }}
        />
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
        <FieldError name={String(name)} />
      </div>
    );
  }

  function FormCheckbox<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N>,
  ) {
    const { name, label, className, description, id } = props;
    const { control } = useFormContext<TFieldValues>();
    const htmlId = id ?? String(name);

    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className={cn("flex items-start gap-2", className)}>
            <Checkbox
              id={htmlId}
              checked={!!field.value}
              onCheckedChange={field.onChange}
              className="mt-0.5"
            />
            <div>
              {label && (
                <Label htmlFor={htmlId} className="text-sm font-normal">
                  {label}
                </Label>
              )}
              {description ? (
                <p className="text-muted-foreground text-xs">{description}</p>
              ) : null}
            </div>
            <FieldError name={String(name)} />
          </div>
        )}
      />
    );
  }

  function FormCustom<N extends Name<Path<TFieldValues>>>(props: {
    name: N;
    children: (args: {
      value: TFieldValues[N];
      onChange: (value: TFieldValues[N]) => void;
    }) => React.ReactNode;
    rules?: RegisterOptions<TFieldValues, N>;
  }) {
    const { name, children, rules } = props;
    const { control } = useFormContext<TFieldValues>();

    return (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: { value, onChange } }) => (
          <>{children({ value, onChange })}</>
        )}
      />
    );
  }

  function FormStringList<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N>,
  ) {
    const { name, label, placeholder, required, className, description, id } = props;
    const { control } = useFormContext<TFieldValues>();
    const htmlId = id ?? String(name);

    return (
      <div className={className}>
        {label && (
          <Label htmlFor={htmlId}>
            {label} {required ? "*" : null}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          rules={{
            validate: (value) => {
              if (!required) return true;
              const arr = Array.isArray(value) ? value : [];
              return arr.length > 0 || requiredMessage(required);
            },
          }}
          render={({ field }) => {
            const arr = Array.isArray(field.value) ? (field.value as string[]) : [];
            return (
              <Input
                id={htmlId}
                className="mt-1"
                placeholder={placeholder ?? "Comma-separated"}
                defaultValue={arr.join(", ")}
                onBlur={field.onBlur}
                onChange={(e) => {
                  const parts = e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  field.onChange(parts);
                }}
              />
            );
          }}
        />
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
        <FieldError name={String(name)} />
      </div>
    );
  }

  function FormEntityCombobox<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N> & {
      modelName: string;
      createAction?: string;
    },
  ) {
    const { name, label, placeholder, required, className, description, modelName } = props;
    const { control, formState } = useFormContext<TFieldValues>();
    const htmlId = props.id ?? String(name);

    // If a default value is already set for this field, it's provided from context — hide
    const defaultValues = formState.defaultValues as Record<string, unknown> | undefined;
    if (defaultValues?.[String(name)]) return null;

    return (
      <div className={className}>
        {label && (
          <Label htmlFor={htmlId}>
            {label} {required ? "*" : null}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          rules={{ required: requiredMessage(required) }}
          render={({ field }) => (
            <div className="mt-1">
              <EntityCombobox
                modelName={modelName}
                value={(field.value as string) ?? ""}
                onChange={field.onChange}
                placeholder={placeholder}
              />
            </div>
          )}
        />
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
        <FieldError name={String(name)} />
      </div>
    );
  }

  function FormCombobox<N extends Name<Path<TFieldValues>>>(
    props: BaseFieldProps<TFieldValues, N> & {
      /** Async function called on mount to load options. */
      queryFn: () => Promise<ComboboxOption[]>;
    },
  ) {
    const { name, label, placeholder, required, className, description, id, queryFn } = props;
    const { control } = useFormContext<TFieldValues>();
    const htmlId = id ?? String(name);

    const [options, setOptions] = React.useState<ComboboxOption[]>([]);

    React.useEffect(() => {
      let cancelled = false;
      queryFn().then((results) => {
        if (!cancelled) setOptions(results);
      });
      return () => { cancelled = true; };
    // queryFn identity is stable per render — run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className={className}>
        {label && (
          <Label htmlFor={htmlId}>
            {label} {required ? "*" : null}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          rules={{ required: requiredMessage(required) }}
          render={({ field }) => (
            <div className="mt-1">
              <Combobox
                value={(field.value as string) ?? ""}
                onChange={field.onChange}
                suggestions={options}
                placeholder={placeholder ?? "Select..."}
              />
            </div>
          )}
        />
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        ) : null}
        <FieldError name={String(name)} />
      </div>
    );
  }

  function FormModal(props: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subTitle?: string | null;
    onSubmit: SubmitHandler<TFieldValues>;
    children: React.ReactNode;
    isSubmitting?: boolean;
    submitText?: string;
    defaultValues?: DefaultValues<TFieldValues>;
  }) {
    const {
      isOpen,
      onClose,
      title,
      subTitle,
      onSubmit,
      children,
      isSubmitting = false,
      submitText = "Submit",
      defaultValues,
    } = props;

    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => !open && !isSubmitting && onClose()}
      >
        <DialogContent className="flex max-h-[90vh] max-w-[480px] flex-col gap-6 rounded-lg bg-background p-8">
          <DialogHeader className="gap-2">
            <DialogTitle className="font-display text-2xl font-normal tracking-tight text-foreground">
              {title}
            </DialogTitle>
            {subTitle && (
              <DialogDescription className="text-sm text-muted-foreground">
                {subTitle}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="h-px bg-border" />

          <Form
            onSubmit={onSubmit}
            defaultValues={defaultValues}
            className="flex min-h-0 flex-1 flex-col"
            mode="onSubmit"
          >
            <div className="flex-1 overflow-y-auto rounded-md border border-border bg-card p-4 shadow-sm space-y-4 [&_input]:bg-primary/[0.07] [&_textarea]:bg-primary/[0.07] [&_[role=combobox]]:bg-primary/[0.07] [&_[data-slot=popover-trigger]]:bg-primary/[0.07] [&_[data-slot=select-trigger]]:bg-primary/[0.07] [&_[data-slot=select-trigger]]:w-full">
              {children}
            </div>

            <div className="h-px bg-border mt-6" />

            <DialogFooter className="mb-0 flex-shrink-0 justify-end gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Discard
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : submitText}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  function FormSheet(props: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subTitle?: string | null;
    onSubmit: SubmitHandler<TFieldValues>;
    children: React.ReactNode;
    isSubmitting?: boolean;
    submitText?: string;
    defaultValues?: DefaultValues<TFieldValues>;
    side?: "right" | "left";
    width?: string;
  }) {
    const {
      isOpen,
      onClose,
      title,
      subTitle,
      onSubmit,
      children,
      isSubmitting = false,
      submitText = "Submit",
      defaultValues,
      side = "right",
      width = "sm:max-w-2xl",
    } = props;

    return (
      <Sheet
        open={isOpen}
        onOpenChange={(open) => !open && !isSubmitting && onClose()}
      >
        <SheetContent
          side={side}
          className={cn("flex h-full w-full flex-col gap-0 p-0", width)}
        >
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle className="font-display text-xl font-normal tracking-tight text-foreground">
              {title}
            </SheetTitle>
            {subTitle && (
              <SheetDescription className="text-sm text-muted-foreground">
                {subTitle}
              </SheetDescription>
            )}
          </SheetHeader>

          <Form
            onSubmit={onSubmit}
            defaultValues={defaultValues}
            className="flex min-h-0 flex-1 flex-col gap-0 space-y-0"
            mode="onSubmit"
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {children}
            </div>

            <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Discard
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : submitText}
              </Button>
            </div>
          </Form>
        </SheetContent>
      </Sheet>
    );
  }

  return {
    Form,
    FormString,
    FormEmail,
    FormNumber,
    FormText,
    FormSelect,
    FormDatetime,
    FormDateRange,
    FormTime,
    FormCheckbox,
    FormStringList,
    FormCombobox,
    FormEntityCombobox,
    FormCustom,
    FormModal,
    FormSheet,
  };
}
