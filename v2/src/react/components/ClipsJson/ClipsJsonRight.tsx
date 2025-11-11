"use client";

import { Card, CardContent } from "../ui/card";

export default function ClipsJsonRight() {
    return (
        <div className="p-4 h-full overflow-y-auto">
            <Card className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <CardContent>
                    <p>Right panel — will show generated JSON or preview results later.</p>
                </CardContent>
            </Card>
        </div>
    );
}
