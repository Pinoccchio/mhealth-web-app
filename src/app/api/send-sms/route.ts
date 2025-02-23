import { NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request: Request) {
  try {
    const { phone, firstName } = await request.json();
    const currentDate = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const message = await client.messages.create({
      body: `MHealth: Your account has been created on ${currentDate}. Welcome to MHealth, ${firstName}! Your health journey begins now. If you have any questions, please contact our support team.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log(`Message sent to ${phone}: ${message.sid}`);

    return NextResponse.json({ success: true, message: "SMS sent successfully" });
  } catch (error) {
    console.error("Error sending SMS:", error);
    return NextResponse.json({ success: false, error: "Failed to send SMS" }, { status: 500 });
  }
}