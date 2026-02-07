import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-2xl overflow-hidden transform transition-all hover:scale-105">
        <div className="p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-accent text-accent-foreground text-xs font-bold uppercase rounded-full">
              Status Check
            </span>
            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          
          <h1 className="text-3xl font-extrabold text-foreground mb-2">
            Tailwind is <span className="text-primary underline decoration-primary">Active</span>
          </h1>
          
          <p className="text-muted-foreground leading-relaxed">
            If you see a dark background, a centered white card with rounded corners, 
            and a pulsing green dot, your configuration is successful.
          </p>
          
          <Button className="mt-6 w-full">Vite + TSX + Tailwind</Button>
        </div>
      </div>
    </div>
  );
}

export default App;