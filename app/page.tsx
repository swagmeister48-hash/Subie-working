import PartsBrowser from "@/components/PartsBrowser";

export default function Home() {
  return (
    <main className="wrap">
      <div className="header">
        <h1>Subaru Parts Price Comparison</h1>
        <p>Compare prices across retailers and jump straight to the best deal.</p>
      </div>
      <PartsBrowser />
    </main>
  );
}
