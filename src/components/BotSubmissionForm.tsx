"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { protocols } from "@/lib/data";

const MAX_FILE_SIZE = 100 * 1024; // 100 KB
const ALLOWED_EXTENSIONS = [".js", ".ts"];

interface ValidationError {
  field: string;
  message: string;
}

export function BotSubmissionForm() {
  const [botName, setBotName] = useState("");
  const [protocolId, setProtocolId] = useState("");
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const validateSubmission = () => {
    const newErrors: ValidationError[] = [];

    // Bot name validation
    if (!botName.trim()) {
      newErrors.push({ field: "name", message: "Bot name is required" });
    } else if (botName.length < 3) {
      newErrors.push({
        field: "name",
        message: "Bot name must be at least 3 characters",
      });
    } else if (botName.length > 50) {
      newErrors.push({
        field: "name",
        message: "Bot name must not exceed 50 characters",
      });
    }

    // Protocol validation
    if (!protocolId) {
      newErrors.push({ field: "protocol", message: "Protocol is required" });
    }

    // Code validation
    if (!code.trim()) {
      newErrors.push({ field: "code", message: "Bot code is required" });
    } else {
      // Size validation
      const sizeInBytes = new Blob([code]).size;
      if (sizeInBytes > MAX_FILE_SIZE) {
        newErrors.push({
          field: "code",
          message: `Code exceeds maximum size of ${MAX_FILE_SIZE / 1024} KB (current: ${Math.round(sizeInBytes / 1024)} KB)`,
        });
      }

      // Basic structure validation
      if (!code.includes("export default") && !code.includes("module.exports")) {
        newErrors.push({
          field: "code",
          message: 'Code must export a default function (e.g., "export default function bot()")',
        });
      }

      // Check for forbidden APIs (simplified check)
      const forbiddenPatterns = [
        /require\s*\(/,
        /import\s+.*\s+from/,
        /fetch\s*\(/,
        /XMLHttpRequest/,
        /WebSocket/,
      ];

      for (const pattern of forbiddenPatterns) {
        if (pattern.test(code)) {
          newErrors.push({
            field: "code",
            message: `Code contains forbidden API: ${pattern.source}. Only Chess.js and protocol interfaces are allowed.`,
          });
          break;
        }
      }
    }

    setErrors(newErrors);
    setIsValid(newErrors.length === 0);
    return newErrors.length === 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrors([
        {
          field: "code",
          message: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
        },
      ]);
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCode(content);
      setErrors([]);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);

    const valid = validateSubmission();

    if (valid) {
      // TODO: Submit to API endpoint
      console.log("Submitting bot:", { botName, protocolId, code });
      alert("Bot submission successful! (API integration coming soon)");
    }

    setIsValidating(false);
  };

  const getFieldError = (field: string) =>
    errors.find((e) => e.field === field)?.message;

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Bot Name */}
        <Card className="bg-neutral-900 border-emerald-900/50">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-emerald-400">
              Bot Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="bot-name"
                className="block text-sm font-mono text-gray-300 mb-2"
              >
                Bot Name *
              </label>
              <input
                id="bot-name"
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="e.g., AlphaChessBot"
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              {getFieldError("name") && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {getFieldError("name")}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="protocol"
                className="block text-sm font-mono text-gray-300 mb-2"
              >
                Protocol *
              </label>
              <select
                id="protocol"
                value={protocolId}
                onChange={(e) => setProtocolId(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select a protocol...</option>
                {protocols.map((protocol) => (
                  <option key={protocol.id} value={protocol.id}>
                    {protocol.title} ({protocol.difficulty})
                  </option>
                ))}
              </select>
              {getFieldError("protocol") && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {getFieldError("protocol")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Code Upload */}
        <Card className="bg-neutral-900 border-emerald-900/50">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-emerald-400">
              Bot Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="code-upload"
                className="block text-sm font-mono text-gray-300 mb-2"
              >
                Upload File (.js or .ts) *
              </label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="code-upload"
                  className="cursor-pointer bg-neutral-800 border border-emerald-600 hover:bg-neutral-700 text-emerald-400 font-mono px-4 py-2 rounded flex items-center gap-2 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </label>
                <input
                  id="code-upload"
                  type="file"
                  accept=".js,.ts"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {fileName && (
                  <span className="text-sm text-gray-400 font-mono">
                    {fileName}
                  </span>
                )}
              </div>
              {getFieldError("code") && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {getFieldError("code")}
                </p>
              )}
            </div>

            {code && (
              <div>
                <label className="block text-sm font-mono text-gray-300 mb-2">
                  Code Preview
                </label>
                <div className="bg-neutral-800 border border-neutral-700 rounded p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                    {code}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isValid && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-mono">
                <CheckCircle2 className="h-4 w-4" />
                Ready to submit
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isValidating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono px-6"
          >
            {isValidating ? "Validating..." : "Submit Bot"}
          </Button>
        </div>

        {/* Validation Summary */}
        {errors.length > 0 && (
          <Card className="bg-red-950/30 border-red-900/50">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Validation Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-red-300">
                {errors.map((error, i) => (
                  <li key={i} className="font-mono">
                    • {error.message}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </form>
  );
}
