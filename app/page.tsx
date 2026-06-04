import { getParts } from "@/lib/supabase";
import PartsBrowser from "@/components/PartsBrowser";

// Revalidate the page data periodically so price updates show without a redeploy.
export const revalidate = 300;

export default async function Home() {
  const parts = await getParts();

  return (
    <main className="wrap">
      <div className="header">
        <h1>Subaru Parts Price Comparison</h1>
        <p>Compare prices across retailers and jump straight to the best deal.</p>
      </div>
      <PartsBrowser parts={parts} />
    </main>
  );
}
