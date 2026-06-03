import { redirect } from "next/navigation";

interface Params {
  params: { bookingId: string };
}

export default function BookingGalleryRedirect({ params }: Params) {
  redirect(`/galleries/${params.bookingId}`);
}
