import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function BookDataError({ reset }: ErrorComponentProps) {
  const queryBoundary = useQueryErrorResetBoundary();
  const router = useRouter();
  return (
    <div role="alert" className="space-y-4 py-6">
      <p>Unable to load reading data. Please try again.</p>
      <Button
        onClick={() => {
          queryBoundary.reset();
          reset();
          void router.invalidate();
        }}
      >
        Try again
      </Button>
    </div>
  );
}

export function BookRefreshError({
  retry,
  pending = false,
}: {
  retry: () => void;
  pending?: boolean;
}) {
  return (
    <div role="alert" className="space-y-2 py-4">
      <p>
        Unable to update reading data. Previously loaded data is still shown.
      </p>
      <Button variant="outline" onClick={retry} disabled={pending}>
        Try again
      </Button>
    </div>
  );
}
