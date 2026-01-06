import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, User, Bell, Shield, Palette } from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState({
    companyName: "Stoq Inc.",
    email: "admin@stoq.com",
    currency: "CAD",
    timezone: "America/Toronto",
    lowStockThreshold: 5,
    criticalStockThreshold: 2,
    emailAlerts: true,
    pushNotifications: true,
    dailyDigest: false,
    autoRefreshInterval: 5,
    twoFactorAuth: false,
  });

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and application preferences
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-card rounded-lg border border-border shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Profile</h3>
            <p className="text-sm text-muted-foreground">
              Your account details
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              value={settings.companyName}
              onChange={(e) =>
                setSettings({ ...settings, companyName: e.target.value })
              }
              className="bg-background"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={settings.email}
              onChange={(e) =>
                setSettings({ ...settings, email: e.target.value })
              }
              className="bg-background"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(v) => setSettings({ ...settings, currency: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Select
                value={settings.timezone}
                onValueChange={(v) => setSettings({ ...settings, timezone: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="America/Toronto">
                    Eastern (Toronto)
                  </SelectItem>
                  <SelectItem value="America/Vancouver">
                    Pacific (Vancouver)
                  </SelectItem>
                  <SelectItem value="America/Chicago">
                    Central (Chicago)
                  </SelectItem>
                  <SelectItem value="Europe/London">GMT (London)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-card rounded-lg border border-border shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-warning/10 text-warning">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <p className="text-sm text-muted-foreground">Alert preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Email Alerts
              </p>
              <p className="text-xs text-muted-foreground">
                Get notified via email
              </p>
            </div>
            <Switch
              checked={settings.emailAlerts}
              onCheckedChange={(v) =>
                setSettings({ ...settings, emailAlerts: v })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Push Notifications
              </p>
              <p className="text-xs text-muted-foreground">
                Browser notifications
              </p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(v) =>
                setSettings({ ...settings, pushNotifications: v })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Daily Digest
              </p>
              <p className="text-xs text-muted-foreground">
                Receive a daily summary
              </p>
            </div>
            <Switch
              checked={settings.dailyDigest}
              onCheckedChange={(v) =>
                setSettings({ ...settings, dailyDigest: v })
              }
            />
          </div>
        </div>
      </div>

      {/* Inventory Settings */}
      <div className="bg-card rounded-lg border border-border shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-accent text-accent-foreground">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Inventory</h3>
            <p className="text-sm text-muted-foreground">
              Stock thresholds and display
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="low-stock">Low Stock Threshold</Label>
            <Input
              id="low-stock"
              type="number"
              value={settings.lowStockThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  lowStockThreshold: parseInt(e.target.value),
                })
              }
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Show warning below this quantity
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="critical-stock">Critical Stock Threshold</Label>
            <Input
              id="critical-stock"
              type="number"
              value={settings.criticalStockThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  criticalStockThreshold: parseInt(e.target.value),
                })
              }
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Show critical below this quantity
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="refresh">Auto-Refresh Interval (minutes)</Label>
            <Input
              id="refresh"
              type="number"
              value={settings.autoRefreshInterval}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoRefreshInterval: parseInt(e.target.value),
                })
              }
              className="bg-background"
            />
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-card rounded-lg border border-border shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-success/10 text-success">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Security</h3>
            <p className="text-sm text-muted-foreground">
              Account security settings
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Two-Factor Authentication
            </p>
            <p className="text-xs text-muted-foreground">
              Add an extra layer of security
            </p>
          </div>
          <Switch
            checked={settings.twoFactorAuth}
            onCheckedChange={(v) =>
              setSettings({ ...settings, twoFactorAuth: v })
            }
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
