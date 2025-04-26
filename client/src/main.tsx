import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Import Remix icon CSS
import "remixicon/fonts/remixicon.css";

createRoot(document.getElementById("root")!).render(<App />);
