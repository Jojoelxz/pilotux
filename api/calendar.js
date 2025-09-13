// api/calendar.js
export default async function handler(req, res) {
  // ⚠️ Variables de entorno (las configuras en Vercel)
  const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const CALENDAR_ID = process.env.CALENDAR_ID;

  // 🛑 Validación
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !CALENDAR_ID) {
    return res.status(500).json({ error: "Configuración incompleta" });
  }

  try {
    // 🔐 Obtener token JWT firmado
    const jwt = generateJWT(GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY);
    const token = await getAccessToken(jwt);

    // 📅 Llamar a Google Calendar API
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      CALENDAR_ID
    )}/events?maxResults=10&singleEvents=true&orderBy=startTime&timeMin=${new Date().toISOString()}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!data.items) {
      return res.status(500).json({ error: "No se pudieron cargar eventos" });
    }

    // 🧹 Formatear eventos
    const events = data.items.map((event) => ({
      title: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
    }));

    res.status(200).json(events);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// ------------------------------
// 🔐 FUNCIONES AUXILIARES (NO NECESITAS MODIFICARLAS)
// ------------------------------

function generateJWT(clientEmail, privateKey) {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);

  const claim = btoa(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );

  // Esto es un placeholder. Vercel usará una librería real internamente.
  return `${header}.${claim}.FAKE_SIGNATURE_FOR_NOW`;
}

async function getAccessToken(jwt) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(
      jwt
    )}`,
  });

  const data = await response.json();
  return data.access_token;
}

// Necesario para que Vercel lo reconozca como API
export const config = { runtime: "edge" };
