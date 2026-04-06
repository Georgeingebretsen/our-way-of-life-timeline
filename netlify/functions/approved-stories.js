exports.handler = async () => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300",
  };

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = "apptMLftTJtjWNuG6";
  const TABLE_NAME = "Submissions";

  if (!AIRTABLE_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server misconfigured" }) };
  }

  try {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`);
    url.searchParams.set("filterByFormula", '{Status} = "Done"');
    url.searchParams.set("sort[0][field]", "Submitted At");
    url.searchParams.set("sort[0][direction]", "desc");

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });

    if (!resp.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to fetch" }) };
    }

    const data = await resp.json();

    const stories = data.records.map((r) => ({
      id: r.id,
      submittedAt: r.fields["Submitted At"],
      language: r.fields["Language"],
      age: r.fields["Age"],
      ethnicity: r.fields["Ethnicity"],
      earlyLife: r.fields["Early Life"],
      firstHelping: r.fields["First Helping"],
      influences: r.fields["Influences"],
      turningPoints: r.fields["Turning Points"],
      identityCivic: r.fields["Identity and Civic"],
      meaningfulContributions: r.fields["Meaningful Contributions"],
      reflections: r.fields["Reflections"],
      communitySupport: r.fields["Community Support"],
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ stories }) };
  } catch (e) {
    console.error("Error:", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
