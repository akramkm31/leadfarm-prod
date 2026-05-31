import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ highlight?: string }>;
};

export default async function AlertsPage({ searchParams }: Props) {
  const { highlight } = await searchParams;
  const q = new URLSearchParams({ alerts: "1" });
  if (highlight) q.set("highlight", highlight);
  redirect(`/dashboard?${q.toString()}`);
}
