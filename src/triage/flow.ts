export type TriageStep = "ASK_NAME" | "ASK_PLATE" | "ASK_LOCATION" | "ASK_SERVICE" | "ASK_FINANCIAL" | "DONE";

export type TriageSession = {
    step: TriageStep;
    name?: string;
    plate?: string;
    location?: string;
    serviceType?: string;
};

export type TriageResult = {
    reply: string;
    step: TriageStep;
    data: Omit<TriageSession, "step">;
};

const sessions = new Map<string, TriageSession>();

const serviceMap: Array<{ match: RegExp; label: string }> = [
    { match: /guincho/i, label: "Guincho" },
    { match: /pane\s*eletric|eletrica|el[eé]tric/i, label: "Pane elétrica" },
    { match: /pneu/i, label: "Pneu" },
    { match: /chaveir/i, label: "Chaveiro" },
    { match: /mec[aâ]nic/i, label: "Mecânico" }
];

const emergencyRegex = /acidente|v[ií]tima|ferid[ao]|capot|batida|colis[aã]o|atropel/i;

function getSession(sessionId: string): TriageSession {
    const existing = sessions.get(sessionId);
    if (existing) {
        return existing;
    }
    const fresh: TriageSession = { step: "ASK_NAME" };
    sessions.set(sessionId, fresh);
    return fresh;
}

function normalize(input: string) {
    return input.trim();
}

function formatConfirmation(session: TriageSession) {
    return `Confere os dados: Nome ${session.name ?? "-"}; Placa ${session.plate ?? "-"}; Local ${session.location ?? "-"}; Serviço ${session.serviceType ?? "-"}.`;
}

function resolveServiceType(input: string) {
    for (const item of serviceMap) {
        if (item.match.test(input)) {
            return item.label;
        }
    }
    return null;
}

export function handleTriageMessage(sessionId: string, message: string): TriageResult {
    const session = getSession(sessionId);
    const text = normalize(message);

    if (emergencyRegex.test(text)) {
        return {
            reply: "Sinto muito! Se houver vítimas, ligue 190/193 agora. Posso ajudar com algo mais? 🚨",
            step: session.step,
            data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
        };
    }

    if (session.step === "ASK_NAME") {
        if (!text) {
            return {
                reply: "Olá! Qual seu nome? 🙂",
                step: session.step,
                data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
            };
        }
        session.name = text;
        session.step = "ASK_PLATE";
        return {
            reply: `Obrigado, ${session.name}! Qual a placa do veículo? 🚗`,
            step: session.step,
            data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
        };
    }

    if (session.step === "ASK_PLATE") {
        if (!text) {
            return {
                reply: "Qual a placa do veículo? 🚗",
                step: session.step,
                data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
            };
        }
        session.plate = text.toUpperCase();
        session.step = "ASK_LOCATION";
        return {
            reply: "Onde você está? (bairro e cidade ou envie localização) 📍",
            step: session.step,
            data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
        };
    }

    if (session.step === "ASK_LOCATION") {
        if (!text) {
            return {
                reply: "Onde você está? (bairro e cidade ou envie localização) 📍",
                step: session.step,
                data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
            };
        }
        session.location = text;
        session.step = "ASK_SERVICE";
        return {
            reply: "Qual o tipo de serviço? (Guincho / Pane elétrica / Pneu / Chaveiro / Mecânico) 🔧",
            step: session.step,
            data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
        };
    }

    if (session.step === "ASK_SERVICE") {
        const resolved = resolveServiceType(text);
        if (!resolved) {
            return {
                reply: "Por favor, escolha: Guincho / Pane elétrica / Pneu / Chaveiro / Mecânico. 🔧",
                step: session.step,
                data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
            };
        }
        session.serviceType = resolved;
        session.step = "ASK_FINANCIAL";
        return {
            reply: "Para teste do sistema: responda 1 para ADIMPLENTE ✅ ou 2 para INADIMPLENTE ❌.",
            step: session.step,
            data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
        };
    }

    if (session.step === "ASK_FINANCIAL") {
        if (text === "1") {
            session.step = "DONE";
            return {
                reply: `Perfeito! Vou abrir a OS e em instantes envio o protocolo. ${formatConfirmation(session)}\n[STATUS_FINANCEIRO=ADIMPLENTE]`,
                step: session.step,
                data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
            };
        }
        if (text === "2") {
            session.step = "DONE";
            return {
                reply: `Existe uma pendência e a OS não pode ser aberta agora. Quer falar com um atendente? ${formatConfirmation(session)}\n[STATUS_FINANCEIRO=INADIMPLENTE]`,
                step: session.step,
                data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
            };
        }
        return {
            reply: "Para teste do sistema: responda 1 para ADIMPLENTE ✅ ou 2 para INADIMPLENTE ❌.",
            step: session.step,
            data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
        };
    }

    return {
        reply: "Posso ajudar em algo mais? 🙂",
        step: session.step,
        data: { name: session.name, plate: session.plate, location: session.location, serviceType: session.serviceType }
    };
}
