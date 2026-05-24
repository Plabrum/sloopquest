import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { StatusBadge } from "@/components/status-badge";
import type { StatusVariant } from "@/lib/status-colors";
import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { MetricBarChart } from "@/components/data-display/metric-bar-chart";
import { MetricAreaChart } from "@/components/data-display/metric-area-chart";
import { StatCards } from "@/components/data-display/stat-card";
import { RailSection } from "@/components/surveys/workspace/rail-section";
import { VesselCard } from "@/components/surveys/workspace/vessel-card";
import { FieldCard } from "@/components/surveys/workspace/field";
import { PhotosRail } from "@/components/surveys/workspace/photos-rail";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/dropzone";
import {
  FormNodeKind,
  SurveyState,
  type SurveyDetail,
  type SurveyFormNodeRef,
  type SurveyMediaListItem,
} from "@/openapi/litestarAPI.schemas";

type Theme = "shad" | "glass" | "angular" | "almanac";
type ColorMode = "light" | "dark" | "system";

const THEMES: { id: Theme; label: string; description: string }[] = [
  { id: "shad", label: "Shad", description: "Base shadcn theme" },
  { id: "angular", label: "Angular", description: "Sharp edges, dense, high contrast" },
  { id: "glass", label: "Glass", description: "Rounded, translucent, soft" },
  { id: "almanac", label: "Almanac", description: "Editorial / nautical, serif + mono" },
];

const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
      <Separator />
    </section>
  );
}

const MOCK_ROWS = [
  { id: "SQ-001", vessel: "MV Seabird", client: "Hartmann & Co", status: "In Progress", date: "2026-05-08" },
  { id: "SQ-002", vessel: "SV Albatross", client: "Nordic Marine", status: "Complete", date: "2026-05-06" },
  { id: "SQ-003", vessel: "MV Ironclad", client: "Pacific Fleet", status: "Draft", date: "2026-05-01" },
];

export function GalleryPage() {
  const { theme, setTheme, colorMode, setColorMode } = useTheme();
  const [switchOn, setSwitchOn] = useState(false);
  const [checked, setChecked] = useState(false);
  const [sliderVal, setSliderVal] = useState([40]);
  const [dropFiles, setDropFiles] = useState<File[] | undefined>(undefined);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Theme bar */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center gap-3 border-b bg-background/80 px-6 py-3 backdrop-blur">
        <span className="text-sm font-medium">Theme</span>
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={[
              "rounded px-3 py-1 text-sm transition-colors",
              theme === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
        <div className="mx-2 h-4 w-px bg-border" />
        <span className="text-sm font-medium">Mode</span>
        {COLOR_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setColorMode(m.id)}
            className={[
              "rounded px-3 py-1 text-sm transition-colors",
              colorMode === m.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            ].join(" ")}
          >
            {m.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {THEMES.find((t) => t.id === theme)?.description}
        </span>
      </div>

      <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">

        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </Section>

        <Section title="Status Badges">
          <StatusBadgeMatrix />
        </Section>

        <Section title="Inputs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Text input</Label>
              <Input placeholder="Enter value…" />
            </div>
            <div className="space-y-2">
              <Label>Select</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Option A</SelectItem>
                  <SelectItem value="b">Option B</SelectItem>
                  <SelectItem value="c">Option C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Textarea</Label>
              <Textarea placeholder="Notes…" rows={3} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={switchOn} onCheckedChange={setSwitchOn} id="sw" />
              <Label htmlFor="sw">Toggle</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cb"
                checked={checked}
                onCheckedChange={(v) => setChecked(Boolean(v))}
              />
              <Label htmlFor="cb">Checkbox</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Slider — {sliderVal[0]}%</Label>
            <Slider value={sliderVal} onValueChange={setSliderVal} max={100} step={1} className="max-w-sm" />
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid grid-cols-2 gap-4">
            <Card className="surface-blur">
              <CardHeader>
                <CardTitle>Survey SQ-001</CardTitle>
                <CardDescription>MV Seabird · Hartmann & Co</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Condition survey requested for insurance renewal. Vessel built 2018.
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm">Open</Button>
                <Button size="sm" variant="outline">Archive</Button>
              </CardFooter>
            </Card>
            <Card className="surface-blur">
              <CardHeader>
                <CardTitle>Invoice #INV-042</CardTitle>
                <CardDescription>Due 2026-05-30</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">$3,200.00</p>
                <p className="text-sm text-muted-foreground">Nordic Marine Consulting</p>
              </CardContent>
              <CardFooter>
                <Badge variant="outline">Unpaid</Badge>
              </CardFooter>
            </Card>
          </div>
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="findings">Findings</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="pt-4 text-sm text-muted-foreground">
              Vessel details and survey metadata would appear here.
            </TabsContent>
            <TabsContent value="findings" className="pt-4 text-sm text-muted-foreground">
              Survey findings and condition ratings would appear here.
            </TabsContent>
            <TabsContent value="photos" className="pt-4 text-sm text-muted-foreground">
              Photo attachments would appear here.
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="Table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Vessel</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ROWS.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.id}</TableCell>
                  <TableCell>{row.vessel}</TableCell>
                  <TableCell>{row.client}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title="Stat Cards">
          <StatCards
            stats={[
              { value: "24", label: "Active surveys", color: "blue", change: { value: 12, direction: "up" } },
              { value: "8", label: "Overdue", color: "red", change: { value: 3.2, direction: "down" } },
              { value: "$18.4k", label: "Invoiced MTD", color: "green", change: { value: 7.1, direction: "up" } },
              { value: "3", label: "Pending review", color: "yellow" },
            ]}
          />
        </Section>

        <Section title="Bar Chart">
          <MetricBarChart
            title="Surveys by vessel type"
            subtitle="Last 6 months"
            bars={[
              { label: "Motor", value: 14 },
              { label: "Sail", value: 9 },
              { label: "Power", value: 11 },
              { label: "Comm.", value: 4 },
              { label: "Work", value: 7 },
            ]}
          />
        </Section>

        <Section title="Area Chart">
          <MetricAreaChart
            title="Revenue over time"
            subtitle="Jan–Jun 2026"
            data={[
              { label: "Jan", invoiced: 8200, collected: 7100 },
              { label: "Feb", invoiced: 9400, collected: 8800 },
              { label: "Mar", invoiced: 7800, collected: 7200 },
              { label: "Apr", invoiced: 12100, collected: 10500 },
              { label: "May", invoiced: 18400, collected: 14200 },
              { label: "Jun", invoiced: 15600, collected: 13800 },
            ]}
            series={[
              { key: "invoiced", label: "Invoiced" },
              { key: "collected", label: "Collected" },
            ]}
            valuePrefix="$"
          />
        </Section>

        <Section title="Survey · Rail (Vessel + Photos)">
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-sm border border-ink/10 bg-card p-4">
              <VesselCard data={MOCK_SURVEY_DETAIL} />
              <RailSection label="Notes" meta="(3)">
                <ul className="space-y-1 font-serif text-[13px] italic leading-snug text-ink-soft">
                  <li>Survey scheduled for slip 14, west marina.</li>
                  <li>Owner requested gelcoat condition photos.</li>
                  <li>Last haul-out: 2024-09-12.</li>
                </ul>
              </RailSection>
            </div>
            <div className="rounded-sm border border-ink/10 bg-card p-4">
              <PhotosRail
                items={MOCK_MEDIA.slice(0, 6)}
                unassigned={MOCK_MEDIA.slice(6)}
                sectionLabel="Hull"
              />
            </div>
          </div>
        </Section>

        <Section title="Survey · Field Cards">
          <div className="space-y-0">
            {MOCK_FIELD_NODES.map((node, i) => (
              <FieldCard
                key={node.id}
                node={node}
                fieldIndex={i}
                fieldTotal={MOCK_FIELD_NODES.length}
                onSave={() => {}}
              />
            ))}
          </div>
        </Section>

        <Section title="Dropzone">
          <div className="grid grid-cols-2 gap-4">
            <Dropzone
              maxFiles={5}
              accept={{ "image/*": [".png", ".jpg", ".jpeg"] }}
              maxSize={5 * 1024 * 1024}
              src={dropFiles}
              onDrop={(files) => setDropFiles(files)}
            >
              <DropzoneEmptyState />
              <DropzoneContent />
            </Dropzone>
            <Dropzone disabled src={undefined}>
              <DropzoneEmptyState />
              <DropzoneContent />
            </Dropzone>
          </div>
        </Section>

        <Section title="Avatars & Skeletons">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarFallback>PL</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>NK</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>JR</AvatarFallback>
            </Avatar>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-36" />
          </div>
        </Section>

      </div>
    </div>
  );
}

const MOCK_SURVEY_DETAIL: SurveyDetail = {
  id: "svy_001",
  state: SurveyState.in_draft,
  vessel: { id: "ves_001", label: "MV Seabird", href: "/objects/vessel/ves_001" },
  surveyor: { id: "usr_001", label: "P. Labrum", href: "/objects/user/usr_001" },
  form_nodes: [],
  unassigned_media: [],
  section_completion: [],
};

const MOCK_MEDIA: SurveyMediaListItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: `med_${i}`,
  view_url: `https://picsum.photos/seed/sloop-${i}/200/200`,
  thumbnail_url: `https://picsum.photos/seed/sloop-${i}/120/120`,
  caption: null,
  node_id: i < 6 ? "node_hull" : null,
  filename: `photo-${i}.jpg`,
  content_type: "image/jpeg",
  size_bytes: 100_000,
  created_at: "2026-05-20T12:00:00Z",
  uploaded_by: { id: "usr_001", label: "P. Labrum", href: "/objects/user/usr_001" },
} as SurveyMediaListItem));

const MOCK_FIELD_NODES: SurveyFormNodeRef[] = [
  {
    id: "f1",
    kind: FormNodeKind.field,
    label: "Hull serial number",
    value: "SBR-2018-04421",
    sort_order: 0,
    config: { type: "text", label: "Hull serial number", required: true },
  },
  {
    id: "f2",
    kind: FormNodeKind.field,
    label: "Overall condition",
    value: "good",
    sort_order: 1,
    config: { type: "segmented", label: "Overall condition", options: ["poor", "fair", "good", "excellent"] },
  },
  {
    id: "f3",
    kind: FormNodeKind.field,
    label: "Surveyor notes",
    value: "Gelcoat exhibits minor crazing at port bow. Recommend cosmetic repair only.",
    sort_order: 2,
    config: { type: "longtext", label: "Surveyor notes" },
  },
  {
    id: "f4",
    kind: FormNodeKind.field,
    label: "Last haul-out",
    value: "2024-09-12",
    sort_order: 3,
    config: { type: "date", label: "Last haul-out" },
  },
  {
    id: "f5",
    kind: FormNodeKind.field,
    label: "Engine type",
    value: "diesel",
    sort_order: 4,
    config: { type: "select", label: "Engine type", options: ["diesel", "gasoline", "electric", "hybrid"] },
  },
];

const STATUS_VARIANTS: { variant: StatusVariant; sample: string }[] = [
  { variant: "active", sample: "active" },
  { variant: "pending", sample: "pending" },
  { variant: "warning", sample: "warning" },
  { variant: "danger", sample: "danger" },
  { variant: "neutral", sample: "neutral" },
  { variant: "info", sample: "info" },
];

const REAL_STATES = [
  "draft",
  "sent",
  "paid",
  "void",
  "refunded",
  "in_review",
  "in_draft",
  "scheduled",
  "completed",
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function StatusBadgeMatrix() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          On card surface
        </h3>
        <Row label="Subtle · default">
          {STATUS_VARIANTS.map((s) => (
            <StatusBadge key={s.variant} status={s.sample} />
          ))}
        </Row>
        <Row label="Subtle · sm">
          {STATUS_VARIANTS.map((s) => (
            <StatusBadge key={s.variant} status={s.sample} size="sm" />
          ))}
        </Row>
        <Row label="Subtle · no dot">
          {STATUS_VARIANTS.map((s) => (
            <StatusBadge key={s.variant} status={s.sample} showDot={false} />
          ))}
        </Row>
        <Row label="Solid · default">
          {STATUS_VARIANTS.map((s) => (
            <StatusBadge key={s.variant} status={s.sample} tone="solid" />
          ))}
        </Row>
        <Row label="Solid · sm">
          {STATUS_VARIANTS.map((s) => (
            <StatusBadge key={s.variant} status={s.sample} tone="solid" size="sm" />
          ))}
        </Row>
      </div>

      <div className="space-y-3 rounded-lg border border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/60">
          On sidebar (dark topbar) surface
        </h3>
        <Row label="Subtle">
          {STATUS_VARIANTS.map((s) => (
            <StatusBadge key={s.variant} status={s.sample} />
          ))}
        </Row>
        <Row label="Solid">
          {STATUS_VARIANTS.map((s) => (
            <StatusBadge key={s.variant} status={s.sample} tone="solid" />
          ))}
        </Row>
        <Row label="In context">
          <div className="flex items-center gap-3 text-sm font-bold">
            <span>Survey</span>
            <StatusBadge status="in_review" tone="solid" showDot={false} />
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span>Invoice INV-042</span>
            <StatusBadge status="sent" tone="solid" showDot={false} />
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span>Quote Q-007</span>
            <StatusBadge status="draft" tone="solid" showDot={false} />
          </div>
        </Row>
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Real domain values (auto-mapped)
        </h3>
        <Row label="Subtle">
          {REAL_STATES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </Row>
        <Row label="Solid">
          {REAL_STATES.map((s) => (
            <StatusBadge key={s} status={s} tone="solid" showDot={false} />
          ))}
        </Row>
      </div>
    </div>
  );
}
