import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { phone, firstName } = await request.json()

    // Ensure phone number is properly formatted (should be like 639XXXXXXXXX)
    const formattedPhone = phone.replace(/^\+/, "").replace(/^0/, "63")

    const currentDate = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const message = `MHealth: Your account has been created on ${currentDate}. Welcome to MHealth, ${firstName}! You can login using your mobile number ${phone}. If you have any questions, please contact our support team.`

    // Log the request details for debugging
    console.log("Sending SMS with IPROG:", {
      phone_number: formattedPhone,
      message: message,
      sms_provider: 1,
      apiToken: process.env.IPROG_API_TOKEN ? "Present" : "Missing",
    })

    // Construct the URL with query parameters including sms_provider=1
    const url = `https://sms.iprogtech.com/api/v1/sms_messages?api_token=${
      process.env.IPROG_API_TOKEN
    }&message=${encodeURIComponent(message)}&phone_number=${formattedPhone}&sms_provider=1`

    // Send request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    // Log the response for debugging
    console.log("IPROG API response:", result)

    if (result.status !== 200) {
      throw new Error(result.message || "Failed to send SMS")
    }

    return NextResponse.json({
      success: true,
      message: "SMS sent successfully",
      messageId: result.message_id,
      details: result,
    })
  } catch (error) {
    console.error("Error sending SMS:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred while sending SMS",
      },
      { status: 500 },
    )
  }
}

