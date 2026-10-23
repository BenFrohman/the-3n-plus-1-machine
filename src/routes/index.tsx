// Copyright (c) 2026 Benjamin Stanley Frohman. Licensed under Apache-2.0.
import { createFileRoute } from "@tanstack/react-router";
import { MachineApp } from "@/components/machine/MachineApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <MachineApp />;
}
