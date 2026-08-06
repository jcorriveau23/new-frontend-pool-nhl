import React from "react";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";

interface UndoButtonProps extends React.ComponentProps<"button"> {
  label?: string;
}

export default function UndoButton({
  label = "Undo",
  className,
  ...props
}: UndoButtonProps) {
  return (
    <Button variant="outline" size="lg" className={className} {...props}>
      <Undo2 />
      {label}
    </Button>
  );
}
