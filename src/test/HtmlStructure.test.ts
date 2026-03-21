import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("HTML Structure Integrity", () => {
    const htmlFiles = [
        path.join(process.cwd(), "update.html"),
        path.join(process.cwd(), "public/update.html")
    ];

    htmlFiles.forEach(filePath => {
        it(`should not have premature </style> closures in ${path.basename(filePath)}`, () => {
            if (!fs.existsSync(filePath)) {
                return; // Skip if file not found locally
            }
            const content = fs.readFileSync(filePath, "utf-8");
            
            // The bug was that </style> was found near line 212 but the block continues
            // We expect ONLY ONE </style> tag per file if it's a simple structure, 
            // or at least that it's NOT followed by more CSS syntax.
            
            const styleClosures = (content.match(/<\/style>/g) || []).length;
            
            // We expect at least one style block
            expect(styleClosures).toBeGreaterThan(0);
            
            // Check that no /* Card styles */ comment exists OUTSIDE a style block
            // This is a proxy for the bug we found.
            const cardStylesIndex = content.indexOf("/* Card styles */");
            const styleCloseIndex = content.indexOf("</style>");
            
            // Card styles MUST be BEFORE the closing style tag
            if (cardStylesIndex !== -1) {
                expect(cardStylesIndex).toBeLessThan(styleCloseIndex);
            }
        });
    });
});
