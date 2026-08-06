import { Button } from "@/components/ui/button";

interface DraftButtonProps extends React.ComponentProps<"button"> {
  label?: string;
}

export default function DraftButton({
  label = "Draft",
  ...props
}: DraftButtonProps) {
  return (
    <Button size="lg" className="font-semibold shadow-sm" {...props}>
      {label}
    </Button>
  );
}
