interface Props {
  title: string;
  subtitle?: string;
  // Rendered beside the title, for a compact status marker that does not
  // deserve a full subtitle line. It drops below the title on a window too
  // narrow to hold both.
  titleAdornment?: React.ReactNode;
}

export default function PageTitle(props: Props) {
  return (
    <div className="flex flex-col gap-1 pb-6 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="min-w-0 text-2xl font-bold tracking-tight break-words">
          {props.title}
        </h1>
        {props.titleAdornment}
      </div>
      {props.subtitle ? (
        <p className="text-muted-foreground text-sm">{props.subtitle}</p>
      ) : null}
    </div>
  );
}
