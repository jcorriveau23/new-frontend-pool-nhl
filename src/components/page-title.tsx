interface Props {
  title: string;
}

export default function PageTitle(props: Props) {
  return <h1 className="text-3xl font-bold text-left">{props.title}</h1>;
}
