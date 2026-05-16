import { Spinner } from "@shipyard/ui/components/spinner";

export function Loader({
  message = "Loading...",
  size = 6,
  direction = "horizontal",
}: {
  message?: string;
  size?: number;
  direction?: "horizontal" | "vertical";
}) {
  return (
    <div
      className={`flex ${direction === "vertical" ? "flex-col" : "items-center"} gap-2 py-6`}
    >
      <Spinner className={`size-${size.toString()}`} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
