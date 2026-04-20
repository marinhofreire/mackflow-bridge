function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function inputField({ name, label, value = "", required = false, type = "text", placeholder = "" }) {
  const requiredAttr = required ? "required" : "";
  return `
    <label class="block">
      <span class="mb-2 block text-sm font-semibold text-slate-700">${escapeHtml(label)}</span>
      <input
        class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        type="${escapeHtml(type)}"
        name="${escapeHtml(name)}"
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(placeholder)}"
        ${requiredAttr}
      />
    </label>
  `;
}

function textAreaField({ name, label, value = "", placeholder = "" }) {
  return `
    <label class="block">
      <span class="mb-2 block text-sm font-semibold text-slate-700">${escapeHtml(label)}</span>
      <textarea
        class="h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        name="${escapeHtml(name)}"
        placeholder="${escapeHtml(placeholder)}"
      >${escapeHtml(value)}</textarea>
    </label>
  `;
}

export function renderPainel({ secret, client = {}, selectedPhone = "", saved = false, error = "" }) {
  const statusHtml = saved
    ? `<div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Configuracao salva no CLIENTS_KV com sucesso.</div>`
    : error
      ? `<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">${escapeHtml(error)}</div>`
      : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mackflow Bridge - Painel</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="min-h-screen bg-slate-100 text-slate-900">
    <main class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 class="text-2xl font-bold tracking-tight">Mackflow Bridge - Painel Multi-Tenant</h1>
        <p class="mt-2 text-sm text-slate-600">Edite e salve credenciais por numero de WhatsApp no KV namespace <code>CLIENTS_KV</code>.</p>
      </section>

      ${statusHtml}

      <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 class="text-lg font-semibold">Buscar cliente</h2>
        <form class="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]" method="GET" action="/painel">
          <input type="hidden" name="secret" value="${escapeHtml(secret)}" />
          ${inputField({
            name: "phone",
            label: "Telefone da empresa (chave KV)",
            value: selectedPhone,
            required: true,
            placeholder: "5511999999999",
          })}
          <button class="mt-7 h-12 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-slate-800" type="submit">Carregar</button>
        </form>
      </section>

      <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 class="text-lg font-semibold">Configurar cliente</h2>
        <form class="mt-4 space-y-4" method="POST" action="/painel/salvar?secret=${encodeURIComponent(secret)}">
          <div class="grid gap-4 sm:grid-cols-2">
            ${inputField({
              name: "keyPhone",
              label: "Telefone da empresa (chave KV)",
              value: client.keyPhone || selectedPhone,
              required: true,
              placeholder: "5511999999999",
            })}
            ${inputField({
              name: "tenantId",
              label: "Tenant ID",
              value: client.tenantId,
              placeholder: "souassist-sp",
            })}
            ${inputField({
              name: "companyName",
              label: "Nome da empresa",
              value: client.companyName,
              placeholder: "SouAssist 24h",
            })}
            ${inputField({
              name: "userId",
              label: "CabMe user_id",
              value: client.userId || "1",
              placeholder: "1",
            })}
            ${inputField({
              name: "cabmeBaseUrl",
              label: "CabMe Base URL",
              value: client.cabmeBaseUrl || "https://console.mackflow.com.br/api/",
              placeholder: "https://console.mackflow.com.br/api/",
            })}
            ${inputField({
              name: "cabmeRideBookPath",
              label: "CabMe ride-book path",
              value: client.cabmeRideBookPath || "v1/ride-book/",
              placeholder: "v1/ride-book/",
            })}
            ${inputField({
              name: "cabmeToken",
              label: "CabMe token (Bearer)",
              value: client.cabmeToken,
              placeholder: "token_cabme",
            })}
            ${inputField({
              name: "cabmeApiKey",
              label: "CabMe API Key (opcional)",
              value: client.cabmeApiKey,
              placeholder: "x-api-key",
            })}
            ${inputField({
              name: "whatsappSendUrl",
              label: "Z-Pro endpoint envio",
              value: client.whatsappSendUrl || "https://api.soucall.com.br/send-message",
              placeholder: "https://api.soucall.com.br/send-message",
            })}
            ${inputField({
              name: "whatsappToken",
              label: "Z-Pro token (Bearer)",
              value: client.whatsappToken || client.zproToken,
              placeholder: "token_zpro",
            })}
            ${inputField({
              name: "zproApiId",
              label: "Z-Pro API ID",
              value: client.zproApiId,
              placeholder: "uuid",
            })}
            ${inputField({
              name: "zproInstanceId",
              label: "Z-Pro Instance ID",
              value: client.zproInstanceId,
              placeholder: "instance_id",
            })}
            ${inputField({
              name: "defaultPickupLat",
              label: "Latitude origem padrao",
              value: client.defaultPickupLat || "-23.4773051",
            })}
            ${inputField({
              name: "defaultPickupLng",
              label: "Longitude origem padrao",
              value: client.defaultPickupLng || "-46.539147",
            })}
            ${inputField({
              name: "defaultDropLat",
              label: "Latitude destino padrao",
              value: client.defaultDropLat || "-23.4773051",
            })}
            ${inputField({
              name: "defaultDropLng",
              label: "Longitude destino padrao",
              value: client.defaultDropLng || "-46.539147",
            })}
            ${inputField({
              name: "defaultDropName",
              label: "Nome destino padrao",
              value: client.defaultDropName || "Destino",
            })}
            ${inputField({
              name: "vehicleTypeId",
              label: "Vehicle Type ID",
              value: client.vehicleTypeId || "1",
            })}
            ${inputField({
              name: "totalPeople",
              label: "Total pessoas",
              value: client.totalPeople || "1",
            })}
            ${inputField({
              name: "totalChildren",
              label: "Total criancas",
              value: client.totalChildren || "0",
            })}
          </div>

          ${textAreaField({
            name: "driverMessageTemplate",
            label: "Template WhatsApp para motorista",
            value:
              client.driverMessageTemplate ||
              "Nova ocorrencia enviada para voce. Cliente: {{customer_phone}}. Protocolo: {{protocol}}.",
            placeholder:
              "Use {{customer_phone}} e {{protocol}} no texto.",
          })}

          <button class="h-12 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-500" type="submit">
            Salvar no CLIENTS_KV
          </button>
        </form>
      </section>
    </main>
  </body>
</html>`;
}
