import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { DirectionProvider } from "@radix-ui/react-direction";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <DirectionProvider dir="rtl">
      <App />
    </DirectionProvider>
  </ThemeProvider>
);
