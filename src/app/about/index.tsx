import History from "@/components/History";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about/")({
  component: AboutIndex,
});

function AboutIndex() {
  return <History />;
}
