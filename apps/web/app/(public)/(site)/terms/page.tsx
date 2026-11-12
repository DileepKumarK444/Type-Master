import type { Metadata } from "next";
import { Prose } from "@/components/site/Prose";

export const metadata: Metadata = { title: "Terms of use", description: "The rules for using TypeMaster.", alternates: { canonical: "/terms" } };
const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function Terms() {
  return (
    <Prose title="Terms of use" updated="12 November 2026">
      <p>By using TypeMaster you agree to these terms. They are short on purpose.</p>
      <h2>Your account</h2>
      <p>Keep your password private and your details accurate. You are responsible for activity on your account. You can delete your account at any time from your profile.</p>
      <h2>Fair use</h2>
      <ul>
        <li>Do not submit fabricated or automated results, or try to bypass the checks that keep scores and XP honest.</li>
        <li>Do not attempt to access other users’ data, disrupt the service, or probe it for weaknesses without permission.</li>
        <li>We may remove results or accounts that break these rules.</li>
      </ul>
      <h2>The service</h2>
      <p>TypeMaster is provided “as is”, without promises of uninterrupted or error-free operation. We may change or discontinue features. To the extent the law allows, we are not liable for indirect or consequential losses from using the service.</p>
      <h2>Your content</h2>
      <p>The only content you create is your typing statistics. You keep ownership of it, and you allow us to store and display it to you as part of the service.</p>
      <h2>Changes</h2>
      <p>If these terms change in a meaningful way, we will update the date above. Continuing to use TypeMaster after a change means you accept it.</p>
      {contact && <><h2>Contact</h2><p><a href={`mailto:${contact}`}>{contact}</a></p></>}
    </Prose>
  );
}
