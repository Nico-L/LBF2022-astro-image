const fetch = require('node-fetch')
const client = require('@sendgrid/mail');
client.setApiKey(process.env.SENDGRID_API_KEY);

const handler = async function (event) {
  const variables = JSON.parse(event.queryStringParameters.variables) || null
  const infoMail = JSON.parse(event.queryStringParameters.infoMail) || null
  const urlDesinscription = JSON.parse(event.queryStringParameters.urlDesinscription) || null

  infoMail.urlDesinscription = urlDesinscription.urlMail + "?uuidInscription=" + urlDesinscription.uuidInscription + "&email=" + urlDesinscription.email + "&idAtelier=" + urlDesinscription.idAtelier
  variables.dynamicTemplateData = infoMail

  const message = {
    personalizations: [
      {
        to: variables.to,
        from: variables.from,
        dynamic_template_data: infoMail
      },
    ],
    from: variables.from,
    replyTo: variables.replyTo,
    templateId: "d-3db7863e710b491e89681ccdf840a9f4"
  };
  
  try {
    await client.send(message)
    return {
      statusCode: 200,
      // Could be a custom message or object i.e. JSON.stringify(err)
      body: JSON.stringify({ msg: "ok" }),
    }
  } catch (error) {
    // output to netlify function log
    console.log(error)
    if (error.response)
    {return {
      statusCode: 500,
      // Could be a custom message or object i.e. JSON.stringify(err)
      body: JSON.stringify({ msg: error.response.body }),
    }}
  }
}

module.exports = { handler }
