interface Props {
  title: string;
  subtitle?: string;
  // Rendered on the same line as the title, for a compact status marker that
  // does not deserve a full subtitle line.
  titleAdornment?: React.ReactNode;
}

export default function PageTitle(props: Props) {
  return (
    <div className="flex flex-col gap-1 pb-6 text-left">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{props.title}</h1>
        {props.titleAdornment}
      </div>
      {props.subtitle ? (
        <p className="text-muted-foreground text-sm">{props.subtitle}</p>
      ) : null}
    </div>
  );
}
