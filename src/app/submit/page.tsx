import { Metadata } from "next";
import { BotSubmissionForm } from "@/components/BotSubmissionForm";

export const metadata: Metadata = {
  title: "Submit Bot",
  description: "Submit your bot to compete in BotArena Retro",
};

export default function SubmitPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono mb-2 text-emerald-400">
          BOT SUBMISSION
        </h1>
        <p className="text-gray-400">
          Upload your bot code to compete in the arena. Review the{" "}
          <a
            href="https://github.com/michaelschecht/BotArena-Retro-FB/blob/main/docs/bot-submission-spec.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            submission specification
          </a>{" "}
          before uploading.
        </p>
      </div>

      <BotSubmissionForm />
    </main>
  );
}
