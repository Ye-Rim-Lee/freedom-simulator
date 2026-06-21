import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages는 https://<user>.github.io/<repo>/ 로 서빙되므로 base에 저장소 이름을 넣어야 함.
// 저장소 이름을 바꾸면 아래 'freedom-simulator'도 같이 바꾸세요. (사용자 페이지나 커스텀 도메인이면 "/")
export default defineConfig({
  plugins: [react()],
  base: "/freedom-simulator/",
});
