import { t } from "../i18n/index.js";
import { navigate } from "../router.js";
import { apiFetch } from "../services/api.js";
import { connectSocket, disconnectSocket } from "../services/socket.js";

type Msg = { id: string; senderId: string; content: string; createdAt: string };

export async function renderChat(
  root: HTMLElement,
  threadId: string,
  role: "owner" | "shop",
): Promise<void> {
  const base = role === "owner" ? "#/owner" : "#/shop";
  const { user } = await apiFetch<{ user: { id: string } }>("/api/v1/users/me");
  const me = user.id;

  root.innerHTML =
    '<div class="screen no-nav">' +
    '<div class="header">' +
    `<button type="button" class="btn btn-secondary" id="back" style="width:auto;">${t("inbox")}</button>` +
    '<h1 class="title">Chat</h1></div>' +
    '<div id="thread" style="flex:1;overflow:auto;padding-bottom:72px;"></div>' +
    '<div style="position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:#fff;border-top:1px solid #eee;padding:8px;display:flex;gap:8px;">' +
    '<input class="inp" id="txt" style="flex:1;" />' +
    '<button type="button" class="btn btn-primary" style="width:auto;" id="send">Send</button>' +
    "</div>" +
    "</div>";

  const box = root.querySelector("#thread")!;

  function renderMessages(messages: Msg[]): void {
    box.innerHTML = messages
      .map((m) => {
        const mine = m.senderId === me;
        return (
          '<div style="margin:8px 0;text-align:' +
          (mine ? "end" : "start") +
          ';">' +
          '<span style="display:inline-block;max-width:85%;padding:8px 10px;border-radius:10px;background:' +
          (mine ? "var(--color-primary)" : "#fff") +
          ";color:" +
          (mine ? "#fff" : "#111") +
          ';border:0.5px solid #eee;">' +
          escapeHtml(m.content) +
          "</span></div>"
        );
      })
      .join("");
    box.scrollTop = box.scrollHeight;
  }

  const res = await apiFetch<{ messages: Msg[] }>(
    `/api/v1/threads/${threadId}/messages`,
  );
  const msgs: Msg[] = [...res.messages];
  function redraw(): void {
    renderMessages(msgs);
  }
  redraw();

  const socket = await connectSocket();
  socket.emit("join-thread", threadId);
  socket.on("new-message", (m: Msg) => {
    if (msgs.some((x) => x.id === m.id)) return;
    msgs.push(m);
    redraw();
  });

  root.querySelector("#back")?.addEventListener("click", () => {
    socket.off("new-message");
    disconnectSocket();
    navigate(`${base}/inbox`);
  });

  root.querySelector("#send")?.addEventListener("click", async () => {
    const input = root.querySelector<HTMLInputElement>("#txt");
    const text = input?.value.trim() ?? "";
    if (!text) return;
    await apiFetch(`/api/v1/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: text }),
    });
    if (input) input.value = "";
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
