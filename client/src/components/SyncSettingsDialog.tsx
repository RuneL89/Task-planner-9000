import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cloud, KeyRound, Trash2 } from "lucide-react";

interface SyncSettingsDialogProps {
  pat: string;
  onSavePat: (pat: string) => void;
  onClearPat: () => void;
}

export function SyncSettingsDialog({ pat, onSavePat, onClearPat }: SyncSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(pat);

  const handleSave = () => {
    onSavePat(input.trim());
    setOpen(false);
  };

  const handleClear = () => {
    onClearPat();
    setInput("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Cloud className="w-4 h-4 mr-2" />
          GitHub Sync Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>GitHub Sync</DialogTitle>
          <DialogDescription>
            Sync your tasks across devices using a JSON file stored in your GitHub repo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pat" className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Personal Access Token
            </Label>
            <Input
              id="pat"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Create a token with <code>repo</code> scope at{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                github.com/settings/tokens
              </a>
              .
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              Save Token
            </Button>
            {pat && (
              <Button variant="destructive" onClick={handleClear}>
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
