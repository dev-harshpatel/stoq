'use client'

import { UserLayout } from '@/components/UserLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GradeBadge } from '@/components/GradeBadge';
import { FileText, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const gradeInfo = [
  {
    grade: 'A' as const,
    title: 'Grade A - Excellent Condition',
    description: 'Like-new condition with minimal to no signs of use',
    conditions: [
      'No visible scratches or dents',
      'Original packaging may be included',
      'All original accessories present',
      'Battery health above 90%',
      'Screen in perfect condition',
      'All functions working perfectly',
      'May have minor cosmetic wear',
    ],
    color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  {
    grade: 'B' as const,
    title: 'Grade B - Good Condition',
    description: 'Good condition with minor signs of wear',
    conditions: [
      'Minor scratches or scuffs on body',
      'Screen may have light scratches (not visible when on)',
      'Battery health between 80-90%',
      'All functions working properly',
      'May have minor cosmetic imperfections',
      'Original accessories may be missing',
      'Overall good working condition',
    ],
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  },
  {
    grade: 'C' as const,
    title: 'Grade C - Fair Condition',
    description: 'Fair condition with noticeable wear but fully functional',
    conditions: [
      'Visible scratches and scuffs',
      'Screen may have visible scratches',
      'Battery health between 70-80%',
      'All core functions working',
      'May have dents or dings',
      'Cosmetic wear is noticeable',
      'Still fully functional for daily use',
    ],
    color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  {
    grade: 'D' as const,
    title: 'Grade D - Damaged Stock',
    description: 'Damaged items that may have functional issues or significant cosmetic damage',
    conditions: [
      'Significant cosmetic damage',
      'May have functional issues',
      'Screen may have cracks or major scratches',
      'Battery health may be below 70%',
      'May require repairs',
      'Sold as-is with full disclosure',
      'Priced significantly lower than other grades',
    ],
    color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  },
];

const termsAndConditions = [
  {
    title: 'Product Condition',
    items: [
      'All products are thoroughly inspected and graded by our team',
      'Grade descriptions are based on visual and functional assessment',
      'Actual condition may vary slightly from description',
      'Photos are provided when available',
    ],
  },
  {
    title: 'Warranty & Returns',
    items: [
      'Grade A, B, and C items come with a 30-day warranty',
      'Grade D items are sold as-is with no warranty',
      'Returns accepted within 14 days for Grade A, B, and C items',
      'Grade D items are final sale - no returns or exchanges',
      'All returns must be in original condition',
    ],
  },
  {
    title: 'Battery Health',
    items: [
      'Battery health percentages are approximate',
      'Actual battery performance may vary',
      'Battery replacement services available for all grades',
      'Grade D items may require immediate battery replacement',
    ],
  },
  {
    title: 'Accessories & Packaging',
    items: [
      'Original accessories included when available',
      'Missing accessories will be clearly stated in product description',
      'Original packaging may not be included for all items',
      'Generic packaging may be used for Grade B, C, and D items',
    ],
  },
  {
    title: 'Pricing',
    items: [
      'Prices reflect the condition and grade of each item',
      'Grade D items are priced significantly lower due to condition',
      'All prices are in Canadian Dollars (CAD)',
      'Prices are subject to change without notice',
    ],
  },
  {
    title: 'Disclosure',
    items: [
      'All known issues are disclosed in product descriptions',
      'Grade D items will have detailed damage descriptions',
      'We recommend reviewing product details before purchase',
      'Contact us if you have questions about specific items',
    ],
  },
];

export default function GradesPage() {
  return (
    <UserLayout>
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="space-y-6 pb-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Grades Guide</h1>
            <p className="text-muted-foreground mt-2">
              Learn about our grading system and what each grade means for your purchase
            </p>
          </div>

          {/* Grades Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gradeInfo.map((info) => (
              <Card key={info.grade} className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GradeBadge grade={info.grade} />
                      <div>
                        <CardTitle className="text-lg">{info.title}</CardTitle>
                        <CardDescription className="mt-1">{info.description}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground mb-3">Typical Characteristics:</p>
                    <ul className="space-y-2">
                      {info.conditions.map((condition, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{condition}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Terms and Conditions */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Terms and Conditions</CardTitle>
              </div>
              <CardDescription>
                Important information about our grading system and policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {termsAndConditions.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      {section.title}
                    </h3>
                    <ul className="space-y-2 ml-6">
                      {section.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <Card className={cn("border-destructive/20 bg-destructive/5")}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold text-destructive">Important Notice</p>
                  <p className="text-sm text-muted-foreground">
                    Grade D (Damaged Stock) items are sold as-is with no warranty or return policy. 
                    These items may have significant cosmetic damage or functional issues. Please review 
                    product descriptions carefully before purchasing Grade D items. If you have any 
                    questions about a specific item's condition, please contact our support team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}
