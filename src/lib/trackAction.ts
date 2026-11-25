type ActionEvent = {
  type: "scan" | "search";
  market: string;
  status: "success" | "failure";
  product: string;
  category: string;
  failureReason?: string;
};

export function trackAction(event: ActionEvent): void {
  void fetch("/api/track/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).then((response) => {
    if (!response.ok) console.warn(`[analytics] Could not record ${event.type} event (${response.status})`);
  }).catch((error: unknown) => {
    console.warn(`[analytics] Could not record ${event.type} event`, error);
  });
}
