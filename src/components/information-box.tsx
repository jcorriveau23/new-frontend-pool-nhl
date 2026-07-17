import React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { InfoIcon } from "lucide-react";

interface InformationIconProps {
  text: string;
}

const InformationIcon: React.FC<InformationIconProps> = ({ text }) => {
  return (
    <Popover>
      <PopoverTrigger
        nativeButton={false}
        render={<InfoIcon className="cursor-pointer" />}
      />
      <PopoverContent align="start">{text}</PopoverContent>
    </Popover>
  );
};

export default InformationIcon;
