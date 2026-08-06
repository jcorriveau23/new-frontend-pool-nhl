interface Props {
  title: string;
  subtitle?: string;
}

export default function PageTitle(props: Props) {
  return (
    <div className="flex flex-col gap-1 pb-6 text-left">
      <h1 className="text-2xl font-bold tracking-tight">{props.title}</h1>
      {props.subtitle ? (
        <p className="text-muted-foreground text-sm">{props.subtitle}</p>
      ) : null}
    </div>
  );
}
