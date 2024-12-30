interface Props {
  title: string;
}

export default function PageTitle(props: Props) {
  return <h1 className="pb-4 text-2xl font-bold text-left">{props.title}</h1>;
}
