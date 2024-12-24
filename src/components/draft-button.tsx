import { Button, ButtonProps } from "@/components/ui/button";

interface DraftButtonProps extends ButtonProps {
  label?: string;
}

export default function DraftButton({ label = "Draft" }: DraftButtonProps) {
  return (
    <Button className="h-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-full text-xl shadow-lg transform transition-all duration-300 ease-in-out hover:scale-105">
      <span>{label}</span>
    </Button>
  );
}
