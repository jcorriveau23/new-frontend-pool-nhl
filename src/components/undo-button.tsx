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
    <Button
      variant="outline"
      size="lg"
      className={`bg-white text-blue-600 border-blue-600 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      {...props}
    >
      <Undo2 className="w-5 h-5 mr-2" />
      {label}
    </Button>
  );
}
