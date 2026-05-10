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
import { useState } from "react";
import { useTheme } from "@/lib/theme";

type Theme = "shad" | "glass" | "angular";
type ColorMode = "light" | "dark" | "system";

const THEMES: { id: Theme; label: string; description: string }[] = [
  { id: "shad", label: "Shad", description: "Base shadcn theme" },
  { id: "angular", label: "Angular", description: "Sharp edges, dense, high contrast" },
  { id: "glass", label: "Glass", description: "Rounded, translucent, soft" },
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
