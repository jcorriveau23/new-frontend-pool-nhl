"use client";
import { useRouter, usePathname } from "@/navigation";
import { Button } from "./ui/button";
import { ChevronRightIcon, ChevronLeftIcon } from "@radix-ui/react-icons";

interface Props {
  previous: boolean;
  date: string;
}

export default function NextDateButton(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  console.log(pathname);

  const updateDate = (date: string) => {
    const newPathname = pathname.replace(
      /\/(\d{4}-\d{2}-\d{2}|now)(\/|$)/,
      `/${date}$2`
    );
    console.log(newPathname);

    router.push(newPathname);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => updateDate(props.date)}
    >
      {props.previous ? (
        <ChevronLeftIcon className="h-4 w-4" />
      ) : (
        <ChevronRightIcon className="h-4 w-4" />
      )}
    </Button>
  );
}
