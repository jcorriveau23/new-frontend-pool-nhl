interface Props {
  title: string;
}

export default function PageTitle(props: Props) {
  return (
    <h1 className="px-4 pb-4 text-3xl font-bold text-left">{props.title}</h1>
  );
}
