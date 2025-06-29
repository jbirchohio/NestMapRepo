jbirchohio@AlphaCentauri:/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo$ npm run build

> rest-express@1.0.0 build
> npm run build:types && vite build && npm run build:server


> rest-express@1.0.0 build:types
> tsc -b tsconfig.json

client/src/App.tsx:7:39 - error TS2307: Cannot find module '@/state/contexts/AuthContext' or its corresponding type declarations.

7 import { AuthProvider, useAuth } from '@/state/contexts/AuthContext';
                                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/app/examples/page.tsx:28:16 - error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.

28         <style jsx>{`
                  ~~~

client/src/components/AITripGenerator.tsx:305:17 - error TS2740: Type 'GeneratedTrip' is missing the following properties from type 'TripDTO': startDate, endDate, userId, organizationId, and 2 more.

305                 tripData: trip, // Pass the full trip data
                    ~~~~~~~~

  client/src/services/tripService.ts:8:5
    8     tripData: TripDTO;
          ~~~~~~~~
    The expected type comes from property 'tripData' which is declared here on type 'CreateClientItineraryParams'

client/src/components/ActivityItem.tsx:5:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

5 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/ActivityItem.tsx:7:15 - error TS2305: Module '"@shared/types/activity"' has no exported member 'ClientActivity'.

7 import type { ClientActivity } from "@shared/types/activity";
                ~~~~~~~~~~~~~~

client/src/components/ActivityItem.tsx:150:62 - error TS7006: Parameter 'tag' implicitly has an 'any' type.

150                         {activity.tags && activity.tags.map((tag) => (
                                                                 ~~~

client/src/components/ActivityItem.tsx:156:29 - error TS2322: Type '"outline" | "success"' is not assignable to type '"link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined'.
  Type '"success"' is not assignable to type '"link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined'.

156                             variant={activity.completed ? "outline" : "success"}
                                ~~~~~~~

  client/src/components/ui/button.tsx:7:9
      7         variant: {
                ~~~~~~~~~~
      8             default: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 shadow-sm transition-colors min-h-[2.5rem]",
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    ...
     13             link: "text-blue-600 underline-offset-4 hover:underline hover:text-blue-700 bg-transparent",
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     14         },
        ~~~~~~~~~
    The expected type comes from property 'variant' which is declared here on type 'IntrinsicAttributes & ButtonProps & RefAttributes<HTMLButtonElement>'

client/src/components/AlertNotifications.tsx:7:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

7 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/AppShell.tsx:3:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

3 import { ClientTrip } from "@/lib/types";
                             ~~~~~~~~~~~~~

client/src/components/AsyncComponent.tsx:83:10 - error TS2322: Type 'T' is not assignable to type 'IntrinsicAttributes & ((PropsWithoutRef<T> & RefAttributes<Component<T, any, any>>) | PropsWithRef<T>)'.
  Type 'object' is not assignable to type 'IntrinsicAttributes & ((PropsWithoutRef<T> & RefAttributes<Component<T, any, any>>) | PropsWithRef<T>)'.
    Type 'T' is not assignable to type 'IntrinsicAttributes & PropsWithRef<T>'.
      Type 'object' is not assignable to type 'IntrinsicAttributes & PropsWithRef<T>'.
        Type 'object' is not assignable to type 'PropsWithRef<T>'.
          Type 'T' is not assignable to type 'PropsWithRef<T>'.
            Type 'object' is not assignable to type 'PropsWithRef<T>'.

83         <LazyComponent {...props} />
            ~~~~~~~~~~~~~

client/src/components/BillingDashboard.tsx:9:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

9 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/BookingWorkflow.tsx:79:5 - error TS2411: Property 'primaryTraveler' of type '{ firstName: string; lastName: string; email: string; phone: string; dateOfBirth: string; } | undefined' is not assignable to 'string' index type 'FormDataEntryValue | Record<string, FormDataEntryValue> | FormDataEntryValue[]'.

79     primaryTraveler?: {
       ~~~~~~~~~~~~~~~

client/src/components/BookingWorkflow.tsx:446:13 - error TS2322: Type '{ traveler: string; departureFlight?: SimpleFlight | null | undefined; returnFlight?: SimpleFlight | null | undefined; }[]' is not assignable to type 'TravelerBooking[]'.
  Type '{ traveler: string; departureFlight?: SimpleFlight | null | undefined; returnFlight?: SimpleFlight | null | undefined; }' is not assignable to type 'TravelerBooking'.
    Types of property 'departureFlight' are incompatible.
      Type 'SimpleFlight | null | undefined' is not assignable to type 'SimpleFlight | null'.
        Type 'undefined' is not assignable to type 'SimpleFlight | null'.

446             return updatedBookings;
                ~~~~~~

client/src/components/BookingWorkflow.tsx:479:17 - error TS2322: Type '{ traveler: string; departureFlight?: SimpleFlight | null | undefined; returnFlight?: SimpleFlight | null | undefined; }[]' is not assignable to type 'TravelerBooking[]'.
  Type '{ traveler: string; departureFlight?: SimpleFlight | null | undefined; returnFlight?: SimpleFlight | null | undefined; }' is not assignable to type 'TravelerBooking'.
    Types of property 'departureFlight' are incompatible.
      Type 'SimpleFlight | null | undefined' is not assignable to type 'SimpleFlight | null'.
        Type 'undefined' is not assignable to type 'SimpleFlight | null'.

479                 travelerBookings,
                    ~~~~~~~~~~~~~~~~

  client/src/components/BookingWorkflow.tsx:34:5
    34     travelerBookings: TravelerBooking[];
           ~~~~~~~~~~~~~~~~
    The expected type comes from property 'travelerBookings' which is declared here on type 'TripData'

client/src/components/BookingWorkflow.tsx:584:29 - error TS2322: Type '(e: React.FormEvent<HTMLFormElement>) => Promise<void>' is not assignable to type '(e: FormEvent<Element>) => void'.
  Types of parameters 'e' and 'e' are incompatible.
    Type 'FormEvent<Element>' is not assignable to type 'FormEvent<HTMLFormElement>'.
      Type 'Element' is missing the following properties from type 'HTMLFormElement': acceptCharset, action, autocomplete, elements, and 145 more.

584                             onSubmit={handleClientInfoSubmit}
                                ~~~~~~~~

  client/src/components/booking/FlightSearchForm.tsx:13:5
    13     onSubmit: (e: React.FormEvent) => void;
           ~~~~~~~~
    The expected type comes from property 'onSubmit' which is declared here on type 'IntrinsicAttributes & FlightSearchFormProps'

client/src/components/BrandingOnboarding.tsx:16:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

16 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/components/BudgetOptionsPanel.tsx:1:32 - error TS2307: Cannot find module '@/types/SharedActivityType' or its corresponding type declarations.

1 import SharedActivityType from '@/types/SharedActivityType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/BudgetOptionsPanel.tsx:8:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

8 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/BudgetOptionsPanel.tsx:11:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

11 import { ClientTrip } from "@/lib/types";
                              ~~~~~~~~~~~~~

client/src/components/CalendarIntegration.tsx:9:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

9 import { apiRequest } from '@/lib/queryClient';
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/CarbonExpenseTracker.tsx:1:30 - error TS2307: Cannot find module '@/types/SharedOptionType' or its corresponding type declarations.

1 import SharedOptionType from '@/types/SharedOptionType';
                               ~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/CarbonExpenseTracker.tsx:2:27 - error TS2307: Cannot find module '@/types/SharedRecType' or its corresponding type declarations.

2 import SharedRecType from '@/types/SharedRecType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/CarbonExpenseTracker.tsx:3:34 - error TS2307: Cannot find module '@/types/SharedActivitiesType' or its corresponding type declarations.

3 import SharedActivitiesType from '@/types/SharedActivitiesType';
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/CarbonExpenseTracker.tsx:6:41 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

6 import { apiRequest, queryClient } from '@/lib/queryClient';
                                          ~~~~~~~~~~~~~~~~~~~

client/src/components/CollaborationPresence.tsx:283:26 - error TS2345: Argument of type '"section_focus"' is not assignable to parameter of type 'ActivityAction'.

283             sendActivity('section_focus', { sectionId });
                             ~~~~~~~~~~~~~~~

client/src/components/CollaborationPresence.tsx:290:26 - error TS2345: Argument of type '"section_blur"' is not assignable to parameter of type 'ActivityAction'.

290             sendActivity('section_blur', { sectionId });
                             ~~~~~~~~~~~~~~

client/src/components/CorporateTripOptimizer.tsx:417:126 - error TS2345: Argument of type '(trip: SharedTripType) => JSX.Element' is not assignable to parameter of type '(value: OptimizedTrip, index: number, array: OptimizedTrip[]) => Element'.
  Types of parameters 'trip' and 'value' are incompatible.
    Type 'OptimizedTrip' is missing the following properties from type 'SharedTripType': startDate, endDate, organizationId, collaborators, and 6 more.

417                 </div>) : corporateTrips && Array.isArray(corporateTrips) && corporateTrips.length > 0 ? (corporateTrips.map((trip: SharedTripType) => (<div key={trip.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                                                                                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
418                     <div className="flex items-center gap-4">
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
434                     </Badge>
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
435                   </div>))) : (<div className="text-center py-8">
    ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/CustomSectionBuilder.tsx:1:37 - error TS2307: Cannot find module '@/types/SharedDropAnimationType' or its corresponding type declarations.

1 import SharedDropAnimationType from '@/types/SharedDropAnimationType';
                                      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/DomainManagement.tsx:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/DomainManagement.tsx:2:32 - error TS2307: Cannot find module '@/types/SharedBrandingType' or its corresponding type declarations.

2 import SharedBrandingType from '@/types/SharedBrandingType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/DomainManagement.tsx:5:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

5 import { apiRequest } from '@/lib/queryClient';
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/EnhancedAIAssistantModal.tsx:1:32 - error TS2307: Cannot find module '@/types/SharedActivityType' or its corresponding type declarations.

1 import SharedActivityType from '@/types/SharedActivityType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/EnhancedAIAssistantModal.tsx:4:44 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

4 import { ClientTrip, ClientActivity } from "@/lib/types";
                                             ~~~~~~~~~~~~~

client/src/components/EnhancedAIAssistantModal.tsx:8:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

8 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/FoodSuggestionsPanel.tsx:5:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

5 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/FoodSuggestionsPanel.tsx:8:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

8 import { ClientTrip } from "@/lib/types";
                             ~~~~~~~~~~~~~

client/src/components/Header.tsx:5:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

5 import { ClientTrip } from "@/lib/types";
                             ~~~~~~~~~~~~~

client/src/components/Header.tsx:7:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

7 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/ItineraryOptimizationModal.tsx:1:43 - error TS2307: Cannot find module '@/types/SharedOptimizedActivitiesType' or its corresponding type declarations.

1 import SharedOptimizedActivitiesType from '@/types/SharedOptimizedActivitiesType';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/ItineraryOptimizationModal.tsx:11:44 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

11 import { ClientTrip, ClientActivity } from "@/lib/types";
                                              ~~~~~~~~~~~~~

client/src/components/ItinerarySidebar.tsx:6:44 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

6 import { ClientTrip, ClientActivity } from "@/lib/types";
                                             ~~~~~~~~~~~~~

client/src/components/ItinerarySidebar.tsx:20:29 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

20 import { queryClient } from "@/lib/queryClient";
                               ~~~~~~~~~~~~~~~~~~~

client/src/components/ItinerarySidebar.tsx:21:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

21 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/components/ItinerarySidebar.tsx:222:34 - error TS7006: Parameter 'day' implicitly has an 'any' type.

222                 {trip.days?.map((day, index) => (<Button key={day.toISOString()} variant={day.toDateString() === activeDay.toDateString() ? "default" : "outline"} className="px-3 py-2 text-sm md:text-base h-auto" onClick={() => onChangeDayClick(day)}>
                                     ~~~

client/src/components/ItinerarySidebar.tsx:222:39 - error TS7006: Parameter 'index' implicitly has an 'any' type.

222                 {trip.days?.map((day, index) => (<Button key={day.toISOString()} variant={day.toDateString() === activeDay.toDateString() ? "default" : "outline"} className="px-3 py-2 text-sm md:text-base h-auto" onClick={() => onChangeDayClick(day)}>
                                          ~~~~~

client/src/components/LazyComponentLoader.tsx:39:16 - error TS2307: Cannot find module '../pages/BookingSystem' or its corresponding type declarations.

39   () => import('../pages/BookingSystem'),
                  ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/LazyComponentLoader.tsx:49:16 - error TS2307: Cannot find module '../pages/WhiteLabelSettings' or its corresponding type declarations.

49   () => import('../pages/WhiteLabelSettings'),
                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/MapView.tsx:3:37 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

3 import { MapMarker, MapRoute } from "@/lib/types";
                                      ~~~~~~~~~~~~~

client/src/components/NewTripModal.tsx:1:27 - error TS2307: Cannot find module '@/types/SharedLocType' or its corresponding type declarations.

1 import SharedLocType from '@/types/SharedLocType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/NewTripModal.tsx:8:41 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

8 import { apiRequest, queryClient } from "@/lib/queryClient";
                                          ~~~~~~~~~~~~~~~~~~~

client/src/components/NotificationCenter.tsx:9:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

9 import { apiRequest } from '@/lib/queryClient';
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/OnboardingWizard.tsx:14:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

14 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/components/PdfExport.tsx:5:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

5 import { ClientTrip } from "@/lib/types";
                             ~~~~~~~~~~~~~

client/src/components/PlacesSearch.tsx:6:40 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

6 import { apiRequest, getQueryFn } from "@/lib/queryClient";
                                         ~~~~~~~~~~~~~~~~~~~

client/src/components/PredictiveInsights.tsx:1:35 - error TS2307: Cannot find module '@/types/SharedAlternativeType' or its corresponding type declarations.

1 import SharedAlternativeType from '@/types/SharedAlternativeType';
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/PredictiveInsights.tsx:2:27 - error TS2307: Cannot find module '@/types/SharedDayType' or its corresponding type declarations.

2 import SharedDayType from '@/types/SharedDayType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/PredictiveInsights.tsx:3:30 - error TS2307: Cannot find module '@/types/SharedOptionType' or its corresponding type declarations.

3 import SharedOptionType from '@/types/SharedOptionType';
                               ~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/PredictiveInsights.tsx:4:28 - error TS2307: Cannot find module '@/types/SharedTimeType' or its corresponding type declarations.

4 import SharedTimeType from '@/types/SharedTimeType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/PredictiveInsights.tsx:5:28 - error TS2307: Cannot find module '@/types/SharedDataType' or its corresponding type declarations.

5 import SharedDataType from '@/types/SharedDataType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/PredictiveInsights.tsx:6:34 - error TS2307: Cannot find module '@/types/SharedActivitiesType' or its corresponding type declarations.

6 import SharedActivitiesType from '@/types/SharedActivitiesType';
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/PredictiveInsights.tsx:9:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

9 import { apiRequest } from '@/lib/queryClient';
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/ProposalGenerator.tsx:1:28 - error TS2307: Cannot find module '@/types/SharedDataType' or its corresponding type declarations.

1 import SharedDataType from '@/types/SharedDataType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/ProposalGenerator.tsx:12:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

12 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/components/ProposalGenerator.tsx:189:39 - error TS2322: Type 'number' is not assignable to type 'string'.

189         updateProposalStatus.mutate({ id: selectedProposal.id, status });
                                          ~~

  client/src/components/ProposalGenerator.tsx:79:13
    79             id: string;
                   ~~
    The expected type comes from property 'id' which is declared here on type '{ id: string; status: string; }'

client/src/components/ProposalGenerator.tsx:198:31 - error TS2322: Type 'number' is not assignable to type 'string'.

198         signProposal.mutate({ id: selectedProposal.id, signedBy: signature.signedBy, signatureImage: signature.signatureImage });
                                  ~~

  client/src/components/ProposalGenerator.tsx:99:13
    99             id: string;
                   ~~
    The expected type comes from property 'id' which is declared here on type '{ id: string; signedBy: string; signatureImage?: string | undefined; }'

client/src/components/ProposalGenerator.tsx:219:61 - error TS2322: Type '"success"' is not assignable to type '"default" | "destructive" | "outline" | "secondary" | null | undefined'.

219             {selectedProposal.status === 'signed' && <Badge variant="success">Ready to Invoice</Badge>}
                                                                ~~~~~~~

  client/src/components/ui/badge.tsx:6:9
      6         variant: {
                ~~~~~~~~~~
      7             default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    ...
     10             outline: "text-foreground",
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     11         },
        ~~~~~~~~~
    The expected type comes from property 'variant' which is declared here on type 'IntrinsicAttributes & BadgeProps'

client/src/components/ProposalGenerator.tsx:228:73 - error TS2322: Type '"success"' is not assignable to type '"link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined'.

228             {selectedProposal.status === 'signed' && (<Button size="sm" variant="success" onClick={handleConvertToInvoice}>Convert to Invoice</Button>)}
                                                                            ~~~~~~~

  client/src/components/ui/button.tsx:7:9
      7         variant: {
                ~~~~~~~~~~
      8             default: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 shadow-sm transition-colors min-h-[2.5rem]",
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    ...
     13             link: "text-blue-600 underline-offset-4 hover:underline hover:text-blue-700 bg-transparent",
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     14         },
        ~~~~~~~~~
    The expected type comes from property 'variant' which is declared here on type 'IntrinsicAttributes & ButtonProps & RefAttributes<HTMLButtonElement>'

client/src/components/RenameTripDialog.tsx:8:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

8 import { ClientTrip } from "@/lib/types";
                             ~~~~~~~~~~~~~

client/src/components/RenameTripDialog.tsx:10:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

10 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/components/RoleManagement.tsx:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/RoleManagement.tsx:13:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

13 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/components/ShareRedirectHandler.tsx:5:33 - error TS2307: Cannot find module '@/shared/types/trip' or its corresponding type declarations.

5 import type { ClientTrip } from '@/shared/types/trip';
                                  ~~~~~~~~~~~~~~~~~~~~~

client/src/components/ShareRedirectHandler.tsx:6:34 - error TS2307: Cannot find module '@/shared/types/api' or its corresponding type declarations.

6 import type { ApiResponse } from '@/shared/types/api';
                                   ~~~~~~~~~~~~~~~~~~~~

client/src/components/ShareTripModal.tsx:9:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

9 import { ClientTrip } from "@/lib/types";
                             ~~~~~~~~~~~~~

client/src/components/SmartOptimizer.tsx:1:32 - error TS2307: Cannot find module '@/types/SharedConflictType' or its corresponding type declarations.

1 import SharedConflictType from '@/types/SharedConflictType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/SmartOptimizer.tsx:2:35 - error TS2307: Cannot find module '@/types/SharedConflictIdsType' or its corresponding type declarations.

2 import SharedConflictIdsType from '@/types/SharedConflictIdsType';
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/SmartOptimizer.tsx:3:25 - error TS2307: Cannot find module '@/types/SharedCType' or its corresponding type declarations.

3 import SharedCType from '@/types/SharedCType';
                          ~~~~~~~~~~~~~~~~~~~~~

client/src/components/SmartOptimizer.tsx:4:28 - error TS2307: Cannot find module '@/types/SharedDataType' or its corresponding type declarations.

4 import SharedDataType from '@/types/SharedDataType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/SmartOptimizer.tsx:7:41 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

7 import { apiRequest, queryClient } from '@/lib/queryClient';
                                          ~~~~~~~~~~~~~~~~~~~

client/src/components/SwipeableTrip.tsx:8:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

8 import { ClientTrip } from "@/lib/types";
                             ~~~~~~~~~~~~~

client/src/components/SwipeableTrip.tsx:11:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

11 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/components/TeamManagement.tsx:16:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

16 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/components/TripTeamManagement.tsx:12:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

12 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/components/TripTeamManagement.tsx:13:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

13 import { ClientTrip } from '@/lib/types';
                              ~~~~~~~~~~~~~

client/src/components/TripTemplates.tsx:10:29 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

10 import { queryClient } from "@/lib/queryClient";
                               ~~~~~~~~~~~~~~~~~~~

client/src/components/WeatherSuggestionsPanel.tsx:9:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

9 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/WeatherSuggestionsPanel.tsx:12:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

12 import { ClientTrip } from "@/lib/types";
                              ~~~~~~~~~~~~~

client/src/components/WhiteLabelAccessControl.tsx:3:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

3 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/activities/ActivityForm.tsx:5:15 - error TS2305: Module '"@shared/types/activity"' has no exported member 'ClientActivity'.

5 import type { ClientActivity } from "@shared/types/activity";
                ~~~~~~~~~~~~~~

client/src/components/activities/ActivityModal.tsx:4:15 - error TS2305: Module '"@shared/types/activity"' has no exported member 'ActivityFormValues'.

4 import type { ActivityFormValues, ActivityModalProps } from '@shared/types/activity';
                ~~~~~~~~~~~~~~~~~~

client/src/components/activities/ActivityModal.tsx:4:35 - error TS2305: Module '"@shared/types/activity"' has no exported member 'ActivityModalProps'.

4 import type { ActivityFormValues, ActivityModalProps } from '@shared/types/activity';
                                    ~~~~~~~~~~~~~~~~~~

client/src/components/activities/ActivityModal.tsx:8:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

8 import { apiRequest } from '@/lib/queryClient';
                             ~~~~~~~~~~~~~~~~~~~

client/src/components/activities/ActivityModal.tsx:96:41 - error TS2304: Cannot find name 'ClientActivity'.

96             const activityData: Partial<ClientActivity> = {
                                           ~~~~~~~~~~~~~~

client/src/components/activities/types.ts:2:15 - error TS2305: Module '"@shared/types/activity"' has no exported member 'ClientActivity'.

2 import type { ClientActivity } from '@shared/types/activity';
                ~~~~~~~~~~~~~~

client/src/components/auth/SignupForm.tsx:5:25 - error TS2307: Cannot find module '@/state/contexts/NewAuthContext' or its corresponding type declarations.

5 import { useAuth } from "@/state/contexts/NewAuthContext";
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/booking/BookingWorkflow.tsx:11:10 - error TS2614: Module '"./steps/HotelSelectionStep"' has no exported member 'HotelSelectionStep'. Did you mean to use 'import HotelSelectionStep from "./steps/HotelSelectionStep"' instead?

11 import { HotelSelectionStep } from './steps/HotelSelectionStep';
            ~~~~~~~~~~~~~~~~~~

client/src/components/booking/BookingWorkflow.tsx:214:45 - error TS2345: Argument of type '(prev: ExtendedBookingFormData) => { tripType: "one-way" | "round-trip" | "multi-city"; passengers: number; primaryTraveler: TravelerInfo & { ...; }; ... 18 more ...; returnFlight?: { ...; } | undefined; }' is not assignable to parameter of type 'SetStateAction<ExtendedBookingFormData>'.
  Type '(prev: ExtendedBookingFormData) => { tripType: "one-way" | "round-trip" | "multi-city"; passengers: number; primaryTraveler: TravelerInfo & { ...; }; ... 18 more ...; returnFlight?: { ...; } | undefined; }' is not assignable to type '(prevState: ExtendedBookingFormData) => ExtendedBookingFormData'.
    Call signature return types '{ tripType: "one-way" | "round-trip" | "multi-city"; passengers: number; primaryTraveler: TravelerInfo & { email: string; phone: string; }; additionalTravelers: TravelerInfo[]; ... 17 more ...; returnFlight?: { ...; } | undefined; }' and 'ExtendedBookingFormData' are incompatible.
      The types of 'selectedFlight' are incompatible between these types.
        Type 'unknown' is not assignable to type '{ airline: string; flightNumber: string; price: number; } | undefined'.

214             onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
                                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/booking/BookingWorkflow.tsx:215:13 - error TS2322: Type '(data: Partial<ExtendedBookingFormData>) => void' is not assignable to type '(data: BookingFormData) => void'.
  Types of parameters 'data' and 'data' are incompatible.
    Type 'BookingFormData' is not assignable to type 'Partial<ExtendedBookingFormData>'.
      Types of property 'selectedFlight' are incompatible.
        Type 'unknown' is not assignable to type '{ airline: string; flightNumber: string; price: number; } | undefined'.

215             onSubmit={handleSubmit}
                ~~~~~~~~

  client/src/components/booking/steps/ClientInfoStep.tsx:9:3
    9   onSubmit: (data: BookingFormData) => void;
        ~~~~~~~~
    The expected type comes from property 'onSubmit' which is declared here on type 'IntrinsicAttributes & ClientInfoStepProps'

client/src/components/booking/BookingWorkflow.tsx:224:27 - error TS2345: Argument of type '(prev: ExtendedBookingFormData) => { tripType: "one-way" | "round-trip" | "multi-city"; passengers: number; primaryTraveler: TravelerInfo & { ...; }; ... 18 more ...; returnFlight?: { ...; } | undefined; }' is not assignable to parameter of type 'SetStateAction<ExtendedBookingFormData>'.
  Type '(prev: ExtendedBookingFormData) => { tripType: "one-way" | "round-trip" | "multi-city"; passengers: number; primaryTraveler: TravelerInfo & { ...; }; ... 18 more ...; returnFlight?: { ...; } | undefined; }' is not assignable to type '(prevState: ExtendedBookingFormData) => ExtendedBookingFormData'.
    Call signature return types '{ tripType: "one-way" | "round-trip" | "multi-city"; passengers: number; primaryTraveler: TravelerInfo & { email: string; phone: string; }; additionalTravelers: TravelerInfo[]; ... 17 more ...; returnFlight?: { ...; } | undefined; }' and 'ExtendedBookingFormData' are incompatible.
      The types of 'selectedFlight' are incompatible between these types.
        Type 'unknown' is not assignable to type '{ airline: string; flightNumber: string; price: number; } | undefined'.

224               setFormData(prev => ({ ...prev, ...data }));
                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/booking/BookingWorkflow.tsx:234:22 - error TS7006: Parameter 'data' implicitly has an 'any' type.

234             onNext={(data) => {
                         ~~~~

client/src/components/booking/hooks/useBookingForm.ts:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/booking/services/bookingService.ts:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/booking/steps/HotelSelectionStep.tsx:1:39 - error TS2307: Cannot find module '@/types/SharedCompatibleHotelType' or its corresponding type declarations.

1 import SharedCompatibleHotelType from '@/types/SharedCompatibleHotelType';
                                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/booking/steps/HotelSelectionStep.tsx:2:25 - error TS2307: Cannot find module '@/types/SharedDType' or its corresponding type declarations.

2 import SharedDType from '@/types/SharedDType';
                          ~~~~~~~~~~~~~~~~~~~~~

client/src/components/booking/steps/HotelSelectionStep.tsx:3:25 - error TS2307: Cannot find module '@/types/SharedRType' or its corresponding type declarations.

3 import SharedRType from '@/types/SharedRType';
                          ~~~~~~~~~~~~~~~~~~~~~

client/src/components/booking/steps/HotelSelectionStep.tsx:4:25 - error TS2307: Cannot find module '@/types/SharedAType' or its corresponding type declarations.

4 import SharedAType from '@/types/SharedAType';
                          ~~~~~~~~~~~~~~~~~~~~~

client/src/components/booking/steps/HotelSelectionStep.tsx:5:32 - error TS2307: Cannot find module '@/types/SharedApiHotelType' or its corresponding type declarations.

5 import SharedApiHotelType from '@/types/SharedApiHotelType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/booking/steps/HotelSelectionStep.tsx:387:24 - error TS2339: Property 'guests' does not exist on type 'BookingFormData'.

387       guests: formData.guests?.toString() || '1',
                           ~~~~~~

client/src/components/booking/steps/HotelSelectionStep.tsx:428:64 - error TS2554: Expected 1 arguments, but got 2.

428       const response = await hotelService.searchHotels(params, { signal: controller.signal });
                                                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/booking/steps/HotelSelectionStep.tsx:431:39 - error TS2339: Property 'data' does not exist on type 'Hotel[]'.

431         const mappedHotels = response.data?.map(mapApiHotelToHotel) || [];
                                          ~~~~

client/src/components/booking/steps/HotelSelectionStep.tsx:436:43 - error TS7006: Parameter 'h' implicitly has an 'any' type.

436           const hotel = mappedHotels.find(h => h.id === formData.selectedHotel?.id);
                                              ~

client/src/components/booking/steps/HotelSelectionStep.tsx:442:45 - error TS7006: Parameter 'r' implicitly has an 'any' type.

442               const room = hotel.rooms.find(r => r.id === formData.selectedRoomType?.id);
                                                ~

client/src/components/dnd-stub.tsx:1:32 - error TS2307: Cannot find module '@/types/SharedSnapshotType' or its corresponding type declarations.

1 import SharedSnapshotType from '@/types/SharedSnapshotType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/dnd-stub.tsx:2:32 - error TS2307: Cannot find module '@/types/SharedProvidedType' or its corresponding type declarations.

2 import SharedProvidedType from '@/types/SharedProvidedType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/dnd-stub.tsx:3:30 - error TS2307: Cannot find module '@/types/SharedResultType' or its corresponding type declarations.

3 import SharedResultType from '@/types/SharedResultType';
                               ~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/examples/TodoList.tsx:3:10 - error TS2305: Module '"../../lib/api"' has no exported member 'createResourceHooks'.

3 import { createResourceHooks } from '../../lib/api';
           ~~~~~~~~~~~~~~~~~~~

client/src/components/examples/TodoList.tsx:103:21 - error TS7006: Parameter 'todo' implicitly has an 'any' type.

103         {todos.map((todo) => (
                        ~~~~

client/src/components/examples/TodoList.tsx:131:14 - error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.

131       <style jsx>{`
                 ~~~

client/src/components/navigation/MainNavigation.tsx:130:13 - error TS2552: Cannot find name 'navigate'. Did you mean 'navigator'?

130             navigate('/');
                ~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/typescript@5.8.3/node_modules/typescript/lib/lib.dom.d.ts:28613:13
    28613 declare var navigator: Navigator;
                      ~~~~~~~~~
    'navigator' is declared here.

client/src/components/navigation/MainNavigation.tsx:135:20 - error TS2552: Cannot find name 'navigate'. Did you mean 'navigator'?

135     }, [onSignOut, navigate]);
                       ~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/typescript@5.8.3/node_modules/typescript/lib/lib.dom.d.ts:28613:13
    28613 declare var navigator: Navigator;
                      ~~~~~~~~~
    'navigator' is declared here.

client/src/components/navigation/MainNavigation.tsx:160:8 - error TS2741: Property 'onNotificationsClick' is missing in type '{ isOpen: boolean; onClose: () => void; isAuthenticated: boolean; user: User | null; navigationItems: NavigationItem[]; notifications: Notification[]; onNotificationClick: (id: string) => Promise<...>; onMarkAllAsRead: () => Promise<...>; onSignOut: () => Promise<...>; }' but required in type 'MobileMenuProps'.

160       <MobileMenu isOpen={isMobileMenuOpen} onClose={closeAllMenus} isAuthenticated={isAuthenticated} user={user} navigationItems={navigationItems} notifications={notifications} onNotificationClick={handleNotificationClick} onMarkAllAsRead={handleMarkAllAsRead} onSignOut={handleSignOut}/>
           ~~~~~~~~~~

  client/src/components/navigation/types.ts:32:5
    32     onNotificationsClick: () => void;
           ~~~~~~~~~~~~~~~~~~~~
    'onNotificationsClick' is declared here.

client/src/components/navigation/MobileMenu.tsx:1:22 - error TS2307: Cannot find module '@/unknown/UserIcon' or its corresponding type declarations.

1 import UserIcon from '@/unknown/UserIcon';
                       ~~~~~~~~~~~~~~~~~~~~

client/src/components/navigation/MobileMenu.tsx:30:82 - error TS2322: Type '{}' is not assignable to type 'string'.

30                       {user.avatarUrl ? (<img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt={user.name}/>) : (<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                                                                                    ~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/@types+react@18.3.23/node_modules/@types/react/index.d.ts:3278:9
    3278         src?: string | undefined;
                 ~~~
    The expected type comes from property 'src' which is declared here on type 'DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>'

client/src/components/navigation/MobileMenu.tsx:30:103 - error TS2322: Type 'unknown' is not assignable to type 'string | undefined'.

30                       {user.avatarUrl ? (<img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt={user.name}/>) : (<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                                                                                                         ~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/@types+react@18.3.23/node_modules/@types/react/index.d.ts:3270:9
    3270         alt?: string | undefined;
                 ~~~
    The expected type comes from property 'alt' which is declared here on type 'DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>'

client/src/components/navigation/MobileMenu.tsx:35:72 - error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.

35                       <p className="text-sm font-medium text-gray-700">{user.name}</p>
                                                                          ~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/@types+react@18.3.23/node_modules/@types/react/index.d.ts:2398:9
    2398         children?: ReactNode | undefined;
                 ~~~~~~~~
    The expected type comes from property 'children' which is declared here on type 'DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>'

client/src/components/navigation/MobileMenu.tsx:36:60 - error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.

36                       <p className="text-xs text-gray-500">{user.email}</p>
                                                              ~~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/@types+react@18.3.23/node_modules/@types/react/index.d.ts:2398:9
    2398         children?: ReactNode | undefined;
                 ~~~~~~~~
    The expected type comes from property 'children' which is declared here on type 'DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>'

client/src/components/navigation/UserMenu.tsx:10:67 - error TS2322: Type '{}' is not assignable to type 'string'.

10         {user?.avatarUrl ? (<img className="h-8 w-8 rounded-full" src={user.avatarUrl} alt={`${user.name}'s avatar`}/>) : (<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                                                                     ~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/@types+react@18.3.23/node_modules/@types/react/index.d.ts:3278:9
    3278         src?: string | undefined;
                 ~~~
    The expected type comes from property 'src' which is declared here on type 'DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>'

client/src/components/navigation/UserMenu.tsx:18:52 - error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.

18               <p className="text-sm text-gray-900">{user?.name}</p>
                                                      ~~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/@types+react@18.3.23/node_modules/@types/react/index.d.ts:2398:9
    2398         children?: ReactNode | undefined;
                 ~~~~~~~~
    The expected type comes from property 'children' which is declared here on type 'DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>'

client/src/components/navigation/UserMenu.tsx:19:61 - error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.

19               <p className="truncate text-sm text-gray-500">{user?.email}</p>
                                                               ~~~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/@types+react@18.3.23/node_modules/@types/react/index.d.ts:2398:9
    2398         children?: ReactNode | undefined;
                 ~~~~~~~~
    The expected type comes from property 'children' which is declared here on type 'DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>'

client/src/components/routes/ProtectedRoute.tsx:2:25 - error TS2307: Cannot find module '@/state/contexts/AuthContext' or its corresponding type declarations.

2 import { useAuth } from '@/state/contexts/AuthContext';
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/routes/ProtectedRoute.tsx:4:26 - error TS2307: Cannot find module '@shared/types/auth/UserRole' or its corresponding type declarations.

4 import { UserRole } from '@shared/types/auth/UserRole';
                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/routes/RouteRenderer.tsx:5:26 - error TS2307: Cannot find module '@shared/types/auth/user/index' or its corresponding type declarations.

5 import { UserRole } from '@shared/types/auth/user/index';
                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/DashboardMetrics.tsx:1:35 - error TS2307: Cannot find module '@/types/SharedBillingDataType' or its corresponding type declarations.

1 import SharedBillingDataType from '@/types/SharedBillingDataType';
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/DashboardMetrics.tsx:2:38 - error TS2307: Cannot find module '@/types/SharedBackgroundJobsType' or its corresponding type declarations.

2 import SharedBackgroundJobsType from '@/types/SharedBackgroundJobsType';
                                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/DashboardMetrics.tsx:3:38 - error TS2307: Cannot find module '@/types/SharedActiveSessionsType' or its corresponding type declarations.

3 import SharedActiveSessionsType from '@/types/SharedActiveSessionsType';
                                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/DashboardMetrics.tsx:4:33 - error TS2307: Cannot find module '@/types/SharedAuditLogsType' or its corresponding type declarations.

4 import SharedAuditLogsType from '@/types/SharedAuditLogsType';
                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/DashboardMetrics.tsx:5:29 - error TS2307: Cannot find module '@/types/SharedUsersType' or its corresponding type declarations.

5 import SharedUsersType from '@/types/SharedUsersType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/DashboardMetrics.tsx:6:37 - error TS2307: Cannot find module '@/types/SharedOrganizationsType' or its corresponding type declarations.

6 import SharedOrganizationsType from '@/types/SharedOrganizationsType';
                                      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/SystemMetrics.tsx:1:36 - error TS2307: Cannot find module '@/types/SharedFeatureFlagsType' or its corresponding type declarations.

1 import SharedFeatureFlagsType from '@/types/SharedFeatureFlagsType';
                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/SystemMetrics.tsx:2:35 - error TS2307: Cannot find module '@/types/SharedBillingDataType' or its corresponding type declarations.

2 import SharedBillingDataType from '@/types/SharedBillingDataType';
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/SystemMetrics.tsx:3:33 - error TS2307: Cannot find module '@/types/SharedAuditLogsType' or its corresponding type declarations.

3 import SharedAuditLogsType from '@/types/SharedAuditLogsType';
                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/SystemMetrics.tsx:4:38 - error TS2307: Cannot find module '@/types/SharedBackgroundJobsType' or its corresponding type declarations.

4 import SharedBackgroundJobsType from '@/types/SharedBackgroundJobsType';
                                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/SystemMetrics.tsx:5:38 - error TS2307: Cannot find module '@/types/SharedActiveSessionsType' or its corresponding type declarations.

5 import SharedActiveSessionsType from '@/types/SharedActiveSessionsType';
                                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/SystemMetrics.tsx:6:29 - error TS2307: Cannot find module '@/types/SharedUsersType' or its corresponding type declarations.

6 import SharedUsersType from '@/types/SharedUsersType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/superadmin/SystemMetrics.tsx:7:37 - error TS2307: Cannot find module '@/types/SharedOrganizationsType' or its corresponding type declarations.

7 import SharedOrganizationsType from '@/types/SharedOrganizationsType';
                                      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/ui/calendar.tsx:32:13 - error TS2353: Object literal may only specify known properties, and 'IconLeft' does not exist in type 'Partial<CustomComponents>'.

32             IconLeft: ({ className, ...props }) => (<ChevronLeft className={cn("h-4 w-4", className)} {...props}/>),
               ~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/react-day-picker@9.7.0_react@18.3.1/node_modules/react-day-picker/dist/esm/types/props.d.ts:276:5
    276     components?: Partial<CustomComponents>;
            ~~~~~~~~~~
    The expected type comes from property 'components' which is declared here on type 'IntrinsicAttributes & DayPickerProps'

client/src/components/ui/calendar.tsx:32:26 - error TS7031: Binding element 'className' implicitly has an 'any' type.

32             IconLeft: ({ className, ...props }) => (<ChevronLeft className={cn("h-4 w-4", className)} {...props}/>),
                            ~~~~~~~~~

client/src/components/ui/calendar.tsx:33:27 - error TS7031: Binding element 'className' implicitly has an 'any' type.

33             IconRight: ({ className, ...props }) => (<ChevronRight className={cn("h-4 w-4", className)} {...props}/>),
                             ~~~~~~~~~

client/src/components/ui/chart.tsx:77:15 - error TS2339: Property 'payload' does not exist on type 'Omit<Omit<Props<ValueType, NameType>, PropertiesReadFromContext> & { active?: boolean | undefined; includeHidden?: boolean | undefined; ... 17 more ...; axisId?: AxisId | undefined; } & ClassAttributes<...> & HTMLAttributes<...> & { ...; }, "ref">'.

77 }>(({ active, payload, className, indicator = "dot", hideLabel = false, hideIndicator = false, label, labelFormatter, labelClassName, formatter, color, nameKey, labelKey, }, ref) => {
                 ~~~~~~~

client/src/components/ui/chart.tsx:77:96 - error TS2339: Property 'label' does not exist on type 'Omit<Omit<Props<ValueType, NameType>, PropertiesReadFromContext> & { active?: boolean | undefined; includeHidden?: boolean | undefined; ... 17 more ...; axisId?: AxisId | undefined; } & ClassAttributes<...> & HTMLAttributes<...> & { ...; }, "ref">'.

77 }>(({ active, payload, className, indicator = "dot", hideLabel = false, hideIndicator = false, label, labelFormatter, labelClassName, formatter, color, nameKey, labelKey, }, ref) => {
                                                                                                  ~~~~~

client/src/components/ui/chart.tsx:114:25 - error TS7006: Parameter 'item' implicitly has an 'any' type.

114           {payload.map((item, index) => {
                            ~~~~

client/src/components/ui/chart.tsx:114:31 - error TS7006: Parameter 'index' implicitly has an 'any' type.

114           {payload.map((item, index) => {
                                  ~~~~~

client/src/components/ui/chart.tsx:148:127 - error TS2344: Type '"verticalAlign" | "payload"' does not satisfy the constraint '"string" | "method" | "id" | "role" | "filter" | "fill" | "values" | "onClick" | "style" | "clipPath" | "mask" | "path" | "key" | "suppressHydrationWarning" | "className" | "lang" | ... 421 more ... | "onBBoxUpdate"'.
  Type '"payload"' is not assignable to type '"string" | "method" | "id" | "role" | "filter" | "fill" | "values" | "onClick" | "style" | "clipPath" | "mask" | "path" | "key" | "suppressHydrationWarning" | "className" | "lang" | ... 421 more ... | "onBBoxUpdate"'.

148 const ChartLegendContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
                                                                                                                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/components/ui/chart.tsx:153:19 - error TS2339: Property 'length' does not exist on type '{}'.

153     if (!payload?.length) {
                      ~~~~~~

client/src/components/ui/chart.tsx:157:18 - error TS2339: Property 'map' does not exist on type '{}'.

157         {payload.map((item) => {
                     ~~~

client/src/components/ui/chart.tsx:157:23 - error TS7006: Parameter 'item' implicitly has an 'any' type.

157         {payload.map((item) => {
                          ~~~~

client/src/components/ui/input-otp.tsx:40:29 - error TS2352: Conversion of type 'RenderProps' to type 'OTPInputContextValue' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Index signature for type 'string' is missing in type 'RenderProps'.

40     const inputOTPContext = React.useContext(OTPInputContext) as OTPInputContextValue;
                               ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/config/routes.new.tsx:2:10 - error TS2305: Module '"@shared/types/auth"' has no exported member 'UserRole'.

2 import { UserRole } from '@shared/types/auth';
           ~~~~~~~~

client/src/contexts/WhiteLabelContext.tsx:2:25 - error TS2307: Cannot find module '@/state/contexts/AuthContext' or its corresponding type declarations.

2 import { useAuth } from '@/state/contexts/AuthContext';
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/contexts/auth/NewAuthContext.tsx:7:10 - error TS2305: Module '"@shared/types/auth"' has no exported member 'AuthUser'.

7 import { AuthUser, AuthError, AuthTokens, Permission, LoginDto, RegisterDto } from '@shared/types/auth';
           ~~~~~~~~

client/src/contexts/auth/NewAuthContext.tsx:7:43 - error TS2305: Module '"@shared/types/auth"' has no exported member 'Permission'.

7 import { AuthUser, AuthError, AuthTokens, Permission, LoginDto, RegisterDto } from '@shared/types/auth';
                                            ~~~~~~~~~~

client/src/contexts/auth/NewAuthContext.tsx:7:55 - error TS2305: Module '"@shared/types/auth"' has no exported member 'LoginDto'.

7 import { AuthUser, AuthError, AuthTokens, Permission, LoginDto, RegisterDto } from '@shared/types/auth';
                                                        ~~~~~~~~

client/src/contexts/auth/NewAuthContext.tsx:7:65 - error TS2305: Module '"@shared/types/auth"' has no exported member 'RegisterDto'.

7 import { AuthUser, AuthError, AuthTokens, Permission, LoginDto, RegisterDto } from '@shared/types/auth';
                                                                  ~~~~~~~~~~~

client/src/contexts/auth/NewAuthContext.tsx:146:35 - error TS2551: Property 'accessToken' does not exist on type 'AuthTokens'. Did you mean 'access_token'?

146     tokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
                                      ~~~~~~~~~~~

  shared/dist/types/auth/jwt.d.ts:48:5
    48     access_token: string;
           ~~~~~~~~~~~~
    'access_token' is declared here.

client/src/contexts/auth/NewAuthContext.tsx:146:55 - error TS2551: Property 'refreshToken' does not exist on type 'AuthTokens'. Did you mean 'refresh_token'?

146     tokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
                                                          ~~~~~~~~~~~~

  shared/dist/types/auth/jwt.d.ts:49:5
    49     refresh_token: string;
           ~~~~~~~~~~~~~
    'refresh_token' is declared here.

client/src/contexts/auth/NewAuthContext.tsx:181:7 - error TS2322: Type '"AUTH_ERROR"' is not assignable to type 'AuthErrorCode'.

181       code: 'AUTH_ERROR',
          ~~~~

  shared/dist/types/auth/auth.d.ts:24:5
    24     code: AuthErrorCode;
           ~~~~
    The expected type comes from property 'code' which is declared here on type 'AuthError'

client/src/hooks/useAIAssistant.ts:2:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

2 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/hooks/useAIAssistant.ts:4:56 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

4 import { ClientActivity, ClientTrip, AIResponse } from "@/lib/types";
                                                         ~~~~~~~~~~~~~

client/src/hooks/useActivities.ts:1:32 - error TS2307: Cannot find module '@/types/SharedActivityType' or its corresponding type declarations.

1 import SharedActivityType from '@/types/SharedActivityType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/hooks/useActivities.ts:2:28 - error TS2307: Cannot find module '@/types/SharedTripType' or its corresponding type declarations.

2 import SharedTripType from '@/types/SharedTripType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/hooks/useActivities.ts:4:29 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

4 import { queryClient } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/hooks/useActivities.ts:5:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

5 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/hooks/useActivities.ts:7:32 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

7 import { ClientActivity } from "@/lib/types";
                                 ~~~~~~~~~~~~~

client/src/hooks/useAnalytics.ts:3:25 - error TS2307: Cannot find module '@/state/contexts/AuthContext' or its corresponding type declarations.

3 import { useAuth } from '@/state/contexts/AuthContext';
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/hooks/useAnalytics.ts:4:87 - error TS2307: Cannot find module '@/shared/types/analytics' or its corresponding type declarations.

4 import type { AnalyticsFilterParams, AgencyAnalyticsDTO, CorporateAnalyticsDTO } from '@/shared/types/analytics';
                                                                                        ~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/hooks/useAnalytics.ts:5:31 - error TS2307: Cannot find module '@/shared/types/user' or its corresponding type declarations.

5 import type { UserRole } from '@/shared/types/user';
                                ~~~~~~~~~~~~~~~~~~~~~

client/src/hooks/useAuth.ts:3:43 - error TS2307: Cannot find module '@/state/contexts/AuthContext' or its corresponding type declarations.

3 import { useAuth as useAuthContext } from '@/state/contexts/AuthContext';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/hooks/useAuth.ts:4:27 - error TS2307: Cannot find module '@/shared/types/user/User' or its corresponding type declarations.

4 import type { User } from '@/shared/types/user/User';
                            ~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/hooks/useAutoComplete.tsx:3:41 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

3 import { apiRequest, queryClient } from '@/lib/queryClient';
                                          ~~~~~~~~~~~~~~~~~~~

client/src/hooks/useAutoComplete.tsx:5:32 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

5 import { ClientActivity } from '@/lib/types';
                                 ~~~~~~~~~~~~~

client/src/hooks/useAutoComplete.tsx:62:37 - error TS18046: 'dayActivities' is of type 'unknown'.

62                 for (let i = 0; i < dayActivities.length; i++) {
                                       ~~~~~~~~~~~~~

client/src/hooks/useAutoComplete.tsx:63:38 - error TS18046: 'dayActivities' is of type 'unknown'.

63                     const activity = dayActivities[i];
                                        ~~~~~~~~~~~~~

client/src/hooks/useAutoComplete.tsx:66:42 - error TS18046: 'dayActivities' is of type 'unknown'.

66                     const nextActivity = dayActivities[i + 1];
                                            ~~~~~~~~~~~~~

client/src/hooks/useMapbox.ts:3:37 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

3 import { MapMarker, MapRoute } from "@/lib/types";
                                      ~~~~~~~~~~~~~

client/src/hooks/useMobileFeatures.tsx:1:31 - error TS2307: Cannot find module '@/types/SharedOptionsType' or its corresponding type declarations.

1 import SharedOptionsType from '@/types/SharedOptionsType';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/hooks/useMobileFeatures.tsx:2:25 - error TS2307: Cannot find module '@/types/SharedEType' or its corresponding type declarations.

2 import SharedEType from '@/types/SharedEType';
                          ~~~~~~~~~~~~~~~~~~~~~

client/src/hooks/useMobileFeatures.tsx:3:35 - error TS2307: Cannot find module '@/types/SharedOfflineDataType' or its corresponding type declarations.

3 import SharedOfflineDataType from '@/types/SharedOfflineDataType';
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/hooks/useNotifications.ts:44:13 - error TS2304: Cannot find name 'api'.

44       await api(`/notifications/${id}/read`, 'PATCH');
               ~~~

client/src/hooks/useNotifications.ts:54:13 - error TS2304: Cannot find name 'api'.

54       await api('/notifications/read-all', 'PATCH');
               ~~~

client/src/hooks/useOptimizedQuery.ts:2:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

2 import { apiRequest } from '@/lib/queryClient';
                             ~~~~~~~~~~~~~~~~~~~

client/src/hooks/useTrip.ts:2:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

2 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/hooks/useTrip.ts:4:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

4 import { ClientTrip } from "@/lib/types";
                             ~~~~~~~~~~~~~

client/src/hooks/useTrip.ts:5:10 - error TS2305: Module '"@shared/schema"' has no exported member 'Todo'.

5 import { Todo, Note } from "@shared/schema";
           ~~~~

client/src/hooks/useTrip.ts:5:16 - error TS2305: Module '"@shared/schema"' has no exported member 'Note'.

5 import { Todo, Note } from "@shared/schema";
                 ~~~~

client/src/layouts/MainLayout.tsx:3:25 - error TS2307: Cannot find module '@/state/contexts/AuthContext' or its corresponding type declarations.

3 import { useAuth } from '@/state/contexts/AuthContext';
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/layouts/MainLayout.tsx:8:27 - error TS2307: Cannot find module '@/shared/types/user/User' or its corresponding type declarations.

8 import type { User } from '@/shared/types/user/User';
                            ~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/lib/api/client.ts:1:10 - error TS2724: '"@shared/api"' has no exported member named 'ApiClient'. Did you mean 'apiClient'?

1 import { ApiClient } from '@shared/api';
           ~~~~~~~~~

client/src/lib/api/client.ts:2:25 - error TS2307: Cannot find module '@/state/contexts/AuthContext' or its corresponding type declarations.

2 import { useAuth } from '@/state/contexts/AuthContext';
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/lib/api/client.ts:22:10 - error TS2339: Property 'instance' does not exist on type 'ClientApiClient'.

22     this.instance.interceptors.request.use(
            ~~~~~~~~

client/src/lib/api/client.ts:23:8 - error TS7006: Parameter 'config' implicitly has an 'any' type.

23       (config) => {
          ~~~~~~

client/src/lib/api/client.ts:25:13 - error TS2367: This comparison appears to be unintentional because the types 'AxiosBasicCredentials | undefined' and 'boolean' have no overlap.

25         if ((config as ApiConfig).auth === false) {
               ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/lib/api/client.ts:36:8 - error TS7006: Parameter 'error' implicitly has an 'any' type.

36       (error) => Promise.reject(error)
          ~~~~~

client/src/lib/api/client.ts:40:10 - error TS2339: Property 'instance' does not exist on type 'ClientApiClient'.

40     this.instance.interceptors.response.use(
            ~~~~~~~~

client/src/lib/api/client.ts:41:8 - error TS7006: Parameter 'response' implicitly has an 'any' type.

41       (response) => response,
          ~~~~~~~~

client/src/lib/api/client.ts:42:14 - error TS7006: Parameter 'error' implicitly has an 'any' type.

42       async (error) => {
                ~~~~~

client/src/lib/api/client.ts:48:44 - error TS2339: Property 'retryOnAuthFailure' does not exist on type 'ApiConfig'.

48             (originalRequest as ApiConfig).retryOnAuthFailure !== false) {
                                              ~~~~~~~~~~~~~~~~~~

client/src/lib/api/client.ts:61:27 - error TS2339: Property 'instance' does not exist on type 'ClientApiClient'.

61               return this.instance(originalRequest);
                             ~~~~~~~~

client/src/lib/api/client.ts:144:35 - error TS2339: Property 'post' does not exist on type 'ClientApiClient'.

144       const response = await this.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
                                      ~~~~

client/src/lib/api/types.ts:2:15 - error TS2305: Module '"@shared/types/api"' has no exported member 'ApiSuccessResponse'.

2 import type { ApiSuccessResponse, ApiErrorResponse } from '@shared/types/api';
                ~~~~~~~~~~~~~~~~~~

client/src/lib/api/types.ts:2:35 - error TS2724: '"@shared/types/api"' has no exported member named 'ApiErrorResponse'. Did you mean 'ErrorResponse'?

2 import type { ApiSuccessResponse, ApiErrorResponse } from '@shared/types/api';
                                    ~~~~~~~~~~~~~~~~

client/src/lib/supabase.ts:1:31 - error TS2307: Cannot find module '@/types/SharedSessionType' or its corresponding type declarations.

1 import SharedSessionType from '@/types/SharedSessionType';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/lib/supabase.ts:2:29 - error TS2307: Cannot find module '@/types/SharedEventType' or its corresponding type declarations.

2 import SharedEventType from '@/types/SharedEventType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/lib/supabase.ts:3:32 - error TS2307: Cannot find module '@/types/SharedMetadataType' or its corresponding type declarations.

3 import SharedMetadataType from '@/types/SharedMetadataType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/AdminDashboard.tsx:12:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

12 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/AdminLogs.tsx:1:35 - error TS2307: Cannot find module '@/types/SharedAction_dataType' or its corresponding type declarations.

1 import SharedAction_dataType from '@/types/SharedAction_dataType';
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/AdminLogs.tsx:10:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

10 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/AdminRoles.tsx:12:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

12 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/AdminSettings.tsx:1:29 - error TS2307: Cannot find module '@/types/SharedValueType' or its corresponding type declarations.

1 import SharedValueType from '@/types/SharedValueType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/AdminSettings.tsx:2:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

2 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/AdminSettings.tsx:13:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

13 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/AdminSystemMetrics.tsx:10:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

10 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/AdminSystemMetrics.tsx:157:32 - error TS2693: 'UserRole' only refers to a type, but is being used as a value here.

157     if (!user || user.role !== UserRole.SUPER_ADMIN) {
                                   ~~~~~~~~

client/src/pages/AdminUserActivity.tsx:1:31 - error TS2307: Cannot find module '@/types/SharedDetailsType' or its corresponding type declarations.

1 import SharedDetailsType from '@/types/SharedDetailsType';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/AdminUserActivity.tsx:10:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

10 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/Approvals.tsx:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/Approvals.tsx:12:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

12 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/BookingConfirmation.tsx:1:33 - error TS2307: Cannot find module '@/types/SharedPassengerType' or its corresponding type declarations.

1 import SharedPassengerType from '@/types/SharedPassengerType';
                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/BookingConfirmation.tsx:2:31 - error TS2307: Cannot find module '@/types/SharedSegmentType' or its corresponding type declarations.

2 import SharedSegmentType from '@/types/SharedSegmentType';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/BookingConfirmation.tsx:3:29 - error TS2307: Cannot find module '@/types/SharedSliceType' or its corresponding type declarations.

3 import SharedSliceType from '@/types/SharedSliceType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/BookingConfirmation.tsx:11:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

11 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/BrandingSetup.tsx:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/BrandingSetup.tsx:13:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

13 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/CorporateCards.tsx:1:28 - error TS2307: Cannot find module '@/types/SharedUserType' or its corresponding type declarations.

1 import SharedUserType from '@/types/SharedUserType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/CorporateCards.tsx:2:36 - error TS2307: Cannot find module '@/types/SharedApprovalDataType' or its corresponding type declarations.

2 import SharedApprovalDataType from '@/types/SharedApprovalDataType';
                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/CorporateCards.tsx:3:34 - error TS2307: Cannot find module '@/types/SharedUpdateDataType' or its corresponding type declarations.

3 import SharedUpdateDataType from '@/types/SharedUpdateDataType';
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/CorporateCards.tsx:4:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

4 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/CorporateCards.tsx:5:32 - error TS2307: Cannot find module '@/types/SharedCardDataType' or its corresponding type declarations.

5 import SharedCardDataType from '@/types/SharedCardDataType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/CorporateCards.tsx:8:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

8 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/pages/CorporateCards.tsx:84:77 - error TS7006: Parameter 'res' implicitly has an 'any' type.

84         queryFn: () => apiRequest("GET", "/api/corporate-cards/cards").then(res => res.json()),
                                                                               ~~~

client/src/pages/CorporateCards.tsx:90:64 - error TS7006: Parameter 'res' implicitly has an 'any' type.

90         queryFn: () => apiRequest("GET", "/api/expenses").then(res => res.json()),
                                                                  ~~~

client/src/pages/CorporateCards.tsx:95:80 - error TS7006: Parameter 'res' implicitly has an 'any' type.

95         queryFn: () => apiRequest("GET", "/api/corporate-card/analytics").then(res => res.json()),
                                                                                  ~~~

client/src/pages/CorporateCards.tsx:100:75 - error TS7006: Parameter 'res' implicitly has an 'any' type.

100         queryFn: () => apiRequest("GET", "/api/organizations/users").then(res => res.json()),
                                                                              ~~~

client/src/pages/CorporateCards.tsx:104:119 - error TS7006: Parameter 'res' implicitly has an 'any' type.

104         mutationFn: (cardData: SharedCardDataType) => apiRequest("POST", "/api/corporate-cards/cards", cardData).then(res => res.json()),
                                                                                                                          ~~~

client/src/pages/CorporateCards.tsx:258:126 - error TS7006: Parameter 'res' implicitly has an 'any' type.

258         mutationFn: (approvalData: SharedApprovalDataType) => apiRequest("POST", "/api/expenses/approve", approvalData).then(res => res.json()),
                                                                                                                                 ~~~

client/src/pages/CorporateCardsManagement.tsx:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/CorporateCardsManagement.tsx:4:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

4 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/pages/CorporateCardsManagement.tsx:54:77 - error TS7006: Parameter 'res' implicitly has an 'any' type.

54         queryFn: () => apiRequest("GET", "/api/corporate-cards/cards").then(res => res.json()),
                                                                               ~~~

client/src/pages/CorporateCardsManagement.tsx:59:110 - error TS7006: Parameter 'res' implicitly has an 'any' type.

59         queryFn: () => apiRequest("GET", `/api/corporate-cards/cards/${selectedCard?.id}/transactions`).then(res => res.json()),
                                                                                                                ~~~

client/src/pages/CorporateDashboard.tsx:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/CorporateDashboard.tsx:11:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

11 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/CorporateDashboard.tsx:67:77 - error TS7006: Parameter 'res' implicitly has an 'any' type.

67         queryFn: () => apiRequest("GET", "/api/corporate-cards/cards").then(res => res.json()),
                                                                               ~~~

client/src/pages/Dashboard.tsx:51:33 - error TS2352: Conversion of type 'Trip[]' to type 'TripDTO[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Property 'destination' is missing in type 'Trip' but required in type 'TripDTO'.

51     const trips = useMemo(() => (Array.isArray(tripsData) ? tripsData : []) as TripDTO[], [tripsData]);
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  client/src/types/dtos/trip.ts:6:5
    6     destination: string;
          ~~~~~~~~~~~
    'destination' is declared here.

client/src/pages/EnterpriseDashboard.tsx:1:32 - error TS2307: Cannot find module '@/types/SharedDeadlineType' or its corresponding type declarations.

1 import SharedDeadlineType from '@/types/SharedDeadlineType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/EnterpriseDashboard.tsx:2:32 - error TS2307: Cannot find module '@/types/SharedActivityType' or its corresponding type declarations.

2 import SharedActivityType from '@/types/SharedActivityType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/FlightBooking.tsx:1:31 - error TS2307: Cannot find module '@/types/SharedSegmentType' or its corresponding type declarations.

1 import SharedSegmentType from '@/types/SharedSegmentType';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/FlightBooking.tsx:2:29 - error TS2307: Cannot find module '@/types/SharedSliceType' or its corresponding type declarations.

2 import SharedSliceType from '@/types/SharedSliceType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/FlightBooking.tsx:3:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

3 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/FlightBooking.tsx:4:35 - error TS2307: Cannot find module '@/types/SharedBookingDataType' or its corresponding type declarations.

4 import SharedBookingDataType from '@/types/SharedBookingDataType';
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/FlightBooking.tsx:16:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

16 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/FlightBooking.tsx:83:87 - error TS18046: 'data' is of type 'unknown'.

83                 description: `Your flight has been booked successfully. Booking ID: ${data.data.id}`,
                                                                                         ~~~~

client/src/pages/FlightBooking.tsx:85:38 - error TS18046: 'data' is of type 'unknown'.

85             setLocation(`/bookings/${data.data.id}`);
                                        ~~~~

client/src/pages/FlightResults.tsx:1:27 - error TS2307: Cannot find module '@/types/SharedBagType' or its corresponding type declarations.

1 import SharedBagType from '@/types/SharedBagType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/FlightResults.tsx:10:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

10 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/FlightSearch.tsx:1:29 - error TS2307: Cannot find module '@/types/SharedValueType' or its corresponding type declarations.

1 import SharedValueType from '@/types/SharedValueType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/FlightSearch.tsx:2:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

2 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/FlightSearch.tsx:16:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

16 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/FlightSearch.tsx:286:38 - error TS2339: Property 'success' does not exist on type '{}'.

286         {searchFlightsMutation.data?.success && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                         ~~~~~~~

client/src/pages/FlightSearch.tsx:292:49 - error TS2339: Property 'data' does not exist on type '{}'.

292                     {searchFlightsMutation.data.data.length} flights found
                                                    ~~~~

client/src/pages/FlightSearch.tsx:295:45 - error TS2339: Property 'source' does not exist on type '{}'.

295                 {searchFlightsMutation.data.source === 'duffel_api' && (<p className="text-sm text-green-600 flex items-center gap-1">
                                                ~~~~~~

client/src/pages/FlightSearch.tsx:302:47 - error TS2339: Property 'data' does not exist on type '{}'.

302                   {searchFlightsMutation.data.data.map((flight: FlightOffer, index: number) => (<motion.div key={flight.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedFlight(flight)}>
                                                  ~~~~

client/src/pages/HelpCenter.tsx:11:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

11 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/Home.tsx:7:28 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

7 import { ClientTrip } from "@/lib/types";
                             ~~~~~~~~~~~~~

client/src/pages/InvoiceCenter.tsx:1:32 - error TS2307: Cannot find module '@/types/SharedProposalType' or its corresponding type declarations.

1 import SharedProposalType from '@/types/SharedProposalType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/InvoiceCenter.tsx:2:25 - error TS2307: Cannot find module '@/types/SharedPType' or its corresponding type declarations.

2 import SharedPType from '@/types/SharedPType';
                          ~~~~~~~~~~~~~~~~~~~~~

client/src/pages/InvoiceCenter.tsx:6:41 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

6 import { queryClient, apiRequest } from "@/lib/queryClient";
                                          ~~~~~~~~~~~~~~~~~~~

client/src/pages/InvoiceView.tsx:1:28 - error TS2307: Cannot find module '@/types/SharedItemType' or its corresponding type declarations.

1 import SharedItemType from '@/types/SharedItemType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/InvoiceView.tsx:4:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

4 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/pages/Login.tsx:3:25 - error TS2307: Cannot find module '@/state/contexts/AuthContext' or its corresponding type declarations.

3 import { useAuth } from '@/state/contexts/AuthContext';
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/OrganizationFunding.tsx:1:29 - error TS2307: Cannot find module '@/types/SharedValueType' or its corresponding type declarations.

1 import SharedValueType from '@/types/SharedValueType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/OrganizationFunding.tsx:2:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

2 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/OrganizationFunding.tsx:3:28 - error TS2307: Cannot find module '@/types/SharedDataType' or its corresponding type declarations.

3 import SharedDataType from '@/types/SharedDataType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/OrganizationFunding.tsx:15:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

15 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/PerformanceDashboard.tsx:1:30 - error TS2307: Cannot find module '@/types/SharedSampleType' or its corresponding type declarations.

1 import SharedSampleType from '@/types/SharedSampleType';
                               ~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/PerformanceDashboard.tsx:16:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

16 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/ProfileSettings.tsx:1:29 - error TS2307: Cannot find module '@/types/SharedValueType' or its corresponding type declarations.

1 import SharedValueType from '@/types/SharedValueType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/ProfileSettings.tsx:2:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

2 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/ProfileSettings.tsx:16:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

16 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/ProposalAnalytics.tsx:1:32 - error TS2307: Cannot find module '@/types/SharedProposalType' or its corresponding type declarations.

1 import SharedProposalType from '@/types/SharedProposalType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/ProposalCenter.tsx:1:28 - error TS2307: Cannot find module '@/types/SharedTripType' or its corresponding type declarations.

1 import SharedTripType from '@/types/SharedTripType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/ProposalCenter.tsx:9:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

9 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/pages/ProposalTemplates.tsx:1:28 - error TS2307: Cannot find module '@/types/SharedFormType' or its corresponding type declarations.

1 import SharedFormType from '@/types/SharedFormType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/ProposalTemplates.tsx:4:41 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

4 import { queryClient, apiRequest } from "@/lib/queryClient";
                                          ~~~~~~~~~~~~~~~~~~~

client/src/pages/PublicProposal.tsx:1:28 - error TS2307: Cannot find module '@/types/SharedCostType' or its corresponding type declarations.

1 import SharedCostType from '@/types/SharedCostType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/PublicProposal.tsx:2:33 - error TS2307: Cannot find module '@/types/SharedEventDataType' or its corresponding type declarations.

2 import SharedEventDataType from '@/types/SharedEventDataType';
                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/PublicProposal.tsx:5:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

5 import { apiRequest } from "@/lib/queryClient";
                             ~~~~~~~~~~~~~~~~~~~

client/src/pages/SequentialBooking.tsx:1:30 - error TS2307: Cannot find module '@/types/SharedFlightType' or its corresponding type declarations.

1 import SharedFlightType from '@/types/SharedFlightType';
                               ~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SequentialBooking.tsx:2:32 - error TS2307: Cannot find module '@/types/SharedTravelerType' or its corresponding type declarations.

2 import SharedTravelerType from '@/types/SharedTravelerType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SequentialBooking.tsx:3:28 - error TS2307: Cannot find module '@/types/SharedDateType' or its corresponding type declarations.

3 import SharedDateType from '@/types/SharedDateType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SequentialBooking.tsx:7:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

7 import { apiRequest } from '@/lib/queryClient';
                             ~~~~~~~~~~~~~~~~~~~

client/src/pages/SequentialBooking.tsx:862:17 - error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.

862                 <div className="mb-4">
                    ~~~~~~~~~~~~~~~~~~~~~~
863                   <h4 className="font-medium mb-2">Flights</h4>
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
878             })}
    ~~~~~~~~~~~~~~~
879                 </div>
    ~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SequentialBooking.tsx:886:82 - error TS2339: Property 'name' does not exist on type '{}'.

886                         <span className="font-medium">{bookingData.selectedHotel.name}</span>
                                                                                     ~~~~

client/src/pages/SequentialBooking.tsx:892:86 - error TS2339: Property 'price' does not exist on type '{}'.

892                         <span className="font-semibold">${(bookingData.selectedHotel.price.amount * 3).toFixed(2)}</span>
                                                                                         ~~~~~

client/src/pages/SequentialBooking.tsx:907:91 - error TS2339: Property 'price' does not exist on type '{}'.

907                 const hotelTotal = bookingData.selectedHotel ? (bookingData.selectedHotel.price.amount * 3) : 0;
                                                                                              ~~~~~

client/src/pages/SequentialBooking.tsx:1033:17 - error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.

1033                 <div>
                     ~~~~~
1034                   <h3 className="font-semibold text-lg mb-3">Flight Confirmations</h3>
     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ...
1052                     </div>))}
     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
1053                 </div>
     ~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SequentialBooking.tsx:1061:84 - error TS2339: Property 'name' does not exist on type '{}'.

1061                           <span className="font-medium">{bookingData.selectedHotel.name}</span>
                                                                                        ~~~~

client/src/pages/SequentialBooking.tsx:1087:91 - error TS2339: Property 'price' does not exist on type '{}'.

1087                 const hotelTotal = bookingData.selectedHotel ? (bookingData.selectedHotel.price.amount * 3) : 0;
                                                                                               ~~~~~

client/src/pages/SequentialBookingFlights.tsx:11:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

11 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/SequentialBookingFlights.tsx:288:23 - error TS7006: Parameter 'res' implicitly has an 'any' type.

288                 .then(res => res.airportCode)
                          ~~~

client/src/pages/SequentialBookingFlights.tsx:292:23 - error TS7006: Parameter 'res' implicitly has an 'any' type.

292                 .then(res => res.airportCode)
                          ~~~

client/src/pages/Settings.tsx:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/Settings.tsx:2:28 - error TS2307: Cannot find module '@/types/SharedDataType' or its corresponding type declarations.

2 import SharedDataType from '@/types/SharedDataType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/Settings.tsx:22:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

22 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/Settings.tsx:75:31 - error TS2339: Property 'config' does not exist on type '{}'.

75         if (whiteLabelConfig?.config) {
                                 ~~~~~~

client/src/pages/Settings.tsx:76:45 - error TS2339: Property 'config' does not exist on type '{}'.

76             const config = whiteLabelConfig.config;
                                               ~~~~~~

client/src/pages/SharedTrip.tsx:1:28 - error TS2307: Cannot find module '@/types/SharedTodoType' or its corresponding type declarations.

1 import SharedTodoType from '@/types/SharedTodoType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SharedTrip.tsx:2:28 - error TS2307: Cannot find module '@/types/SharedNoteType' or its corresponding type declarations.

2 import SharedNoteType from '@/types/SharedNoteType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SharedTrip.tsx:3:32 - error TS2307: Cannot find module '@/types/SharedActivityType' or its corresponding type declarations.

3 import SharedActivityType from '@/types/SharedActivityType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SharedTrip.tsx:4:29 - error TS2307: Cannot find module '@/types/SharedTodosType' or its corresponding type declarations.

4 import SharedTodosType from '@/types/SharedTodosType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SharedTrip.tsx:5:29 - error TS2307: Cannot find module '@/types/SharedNotesType' or its corresponding type declarations.

5 import SharedNotesType from '@/types/SharedNotesType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SharedTrip.tsx:6:34 - error TS2307: Cannot find module '@/types/SharedActivitiesType' or its corresponding type declarations.

6 import SharedActivitiesType from '@/types/SharedActivitiesType';
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SimpleShare.tsx:1:28 - error TS2307: Cannot find module '@/types/SharedTodoType' or its corresponding type declarations.

1 import SharedTodoType from '@/types/SharedTodoType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SimpleShare.tsx:2:28 - error TS2307: Cannot find module '@/types/SharedNoteType' or its corresponding type declarations.

2 import SharedNoteType from '@/types/SharedNoteType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SimpleShare.tsx:3:32 - error TS2307: Cannot find module '@/types/SharedActivityType' or its corresponding type declarations.

3 import SharedActivityType from '@/types/SharedActivityType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminClean.tsx:1:28 - error TS2307: Cannot find module '@/types/SharedFlagType' or its corresponding type declarations.

1 import SharedFlagType from '@/types/SharedFlagType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminClean.tsx:2:27 - error TS2307: Cannot find module '@/types/SharedJobType' or its corresponding type declarations.

2 import SharedJobType from '@/types/SharedJobType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminClean.tsx:3:29 - error TS2307: Cannot find module '@/types/SharedEventType' or its corresponding type declarations.

3 import SharedEventType from '@/types/SharedEventType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminClean.tsx:4:27 - error TS2307: Cannot find module '@/types/SharedLogType' or its corresponding type declarations.

4 import SharedLogType from '@/types/SharedLogType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminClean.tsx:16:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

16 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminFixed.tsx:1:28 - error TS2307: Cannot find module '@/types/SharedFlagType' or its corresponding type declarations.

1 import SharedFlagType from '@/types/SharedFlagType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminFixed.tsx:2:29 - error TS2307: Cannot find module '@/types/SharedEventType' or its corresponding type declarations.

2 import SharedEventType from '@/types/SharedEventType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminFixed.tsx:3:27 - error TS2307: Cannot find module '@/types/SharedLogType' or its corresponding type declarations.

3 import SharedLogType from '@/types/SharedLogType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminFixed.tsx:4:27 - error TS2307: Cannot find module '@/types/SharedJobType' or its corresponding type declarations.

4 import SharedJobType from '@/types/SharedJobType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminFixed.tsx:5:31 - error TS2307: Cannot find module '@/types/SharedSessionType' or its corresponding type declarations.

5 import SharedSessionType from '@/types/SharedSessionType';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminFixed.tsx:6:28 - error TS2307: Cannot find module '@/types/SharedUserType' or its corresponding type declarations.

6 import SharedUserType from '@/types/SharedUserType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminFixed.tsx:7:27 - error TS2307: Cannot find module '@/types/SharedOrgType' or its corresponding type declarations.

7 import SharedOrgType from '@/types/SharedOrgType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminFixed.tsx:19:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

19 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminOrganizationDetail.tsx:1:30 - error TS2307: Cannot find module '@/types/SharedMemberType' or its corresponding type declarations.

1 import SharedMemberType from '@/types/SharedMemberType';
                               ~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminOrganizationDetail.tsx:2:32 - error TS2307: Cannot find module '@/types/SharedUserDataType' or its corresponding type declarations.

2 import SharedUserDataType from '@/types/SharedUserDataType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminOrganizationDetail.tsx:3:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

3 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminOrganizationDetail.tsx:4:31 - error TS2307: Cannot find module '@/types/SharedUpdatesType' or its corresponding type declarations.

4 import SharedUpdatesType from '@/types/SharedUpdatesType';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminOrganizationDetail.tsx:8:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

8 import { apiRequest } from '@/lib/queryClient';
                             ~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminSimple.tsx:1:28 - error TS2307: Cannot find module '@/types/SharedFlagType' or its corresponding type declarations.

1 import SharedFlagType from '@/types/SharedFlagType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminSimple.tsx:2:29 - error TS2307: Cannot find module '@/types/SharedEventType' or its corresponding type declarations.

2 import SharedEventType from '@/types/SharedEventType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminSimple.tsx:3:27 - error TS2307: Cannot find module '@/types/SharedLogType' or its corresponding type declarations.

3 import SharedLogType from '@/types/SharedLogType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminSimple.tsx:4:27 - error TS2307: Cannot find module '@/types/SharedJobType' or its corresponding type declarations.

4 import SharedJobType from '@/types/SharedJobType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminSimple.tsx:5:31 - error TS2307: Cannot find module '@/types/SharedSessionType' or its corresponding type declarations.

5 import SharedSessionType from '@/types/SharedSessionType';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminSimple.tsx:6:28 - error TS2307: Cannot find module '@/types/SharedUserType' or its corresponding type declarations.

6 import SharedUserType from '@/types/SharedUserType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminSimple.tsx:7:27 - error TS2307: Cannot find module '@/types/SharedOrgType' or its corresponding type declarations.

7 import SharedOrgType from '@/types/SharedOrgType';
                            ~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminSimple.tsx:17:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

17 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/SuperadminSimple.tsx:23:80 - error TS7006: Parameter 'res' implicitly has an 'any' type.

23         queryFn: () => apiRequest('GET', '/api/superadmin/organizations').then(res => res.json()),
                                                                                  ~~~

client/src/pages/SuperadminSimple.tsx:28:72 - error TS7006: Parameter 'res' implicitly has an 'any' type.

28         queryFn: () => apiRequest('GET', '/api/superadmin/users').then(res => res.json()),
                                                                          ~~~

client/src/pages/SuperadminSimple.tsx:33:75 - error TS7006: Parameter 'res' implicitly has an 'any' type.

33         queryFn: () => apiRequest('GET', '/api/superadmin/sessions').then(res => res.json()),
                                                                             ~~~

client/src/pages/SuperadminSimple.tsx:38:71 - error TS7006: Parameter 'res' implicitly has an 'any' type.

38         queryFn: () => apiRequest('GET', '/api/superadmin/jobs').then(res => res.json()),
                                                                         ~~~

client/src/pages/SuperadminSimple.tsx:43:75 - error TS7006: Parameter 'res' implicitly has an 'any' type.

43         queryFn: () => apiRequest('GET', '/api/superadmin/activity').then(res => res.json()),
                                                                             ~~~

client/src/pages/SuperadminSimple.tsx:48:74 - error TS7006: Parameter 'res' implicitly has an 'any' type.

48         queryFn: () => apiRequest('GET', '/api/superadmin/billing').then(res => res.json()),
                                                                            ~~~

client/src/pages/SuperadminSimple.tsx:53:72 - error TS7006: Parameter 'res' implicitly has an 'any' type.

53         queryFn: () => apiRequest('GET', '/api/superadmin/flags').then(res => res.json()),
                                                                          ~~~

client/src/pages/TripPlanner.tsx:1:31 - error TS2307: Cannot find module '@/types/SharedUpdatesType' or its corresponding type declarations.

1 import SharedUpdatesType from '@/types/SharedUpdatesType';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/TripPlanner.tsx:14:53 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

14 import { ClientActivity, MapMarker, MapRoute } from "@/lib/types";
                                                       ~~~~~~~~~~~~~

client/src/pages/TripPlanner.tsx:16:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

16 import { apiRequest } from "@/lib/queryClient";
                              ~~~~~~~~~~~~~~~~~~~

client/src/pages/WhiteLabelDashboard.tsx:1:32 - error TS2307: Cannot find module '@/types/SharedSettingsType' or its corresponding type declarations.

1 import SharedSettingsType from '@/types/SharedSettingsType';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/pages/WhiteLabelDashboard.tsx:52:13 - error TS2339: Property 'whiteLabelConfig' does not exist on type 'WhiteLabelContextType'.

52     const { whiteLabelConfig, isWhiteLabelActive } = useWhiteLabel();
               ~~~~~~~~~~~~~~~~

client/src/pages/WhiteLabelDomains.tsx:11:28 - error TS2307: Cannot find module '@/lib/queryClient' or its corresponding type declarations.

11 import { apiRequest } from '@/lib/queryClient';
                              ~~~~~~~~~~~~~~~~~~~

client/src/services/api/activityService.ts:3:37 - error TS2307: Cannot find module '@/lib/types' or its corresponding type declarations.

3 import type { ClientActivity } from '@/lib/types';
                                      ~~~~~~~~~~~~~

client/src/services/api/apiClient.ts:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/services/api/apiClient.ts:75:31 - error TS2339: Property 'success' does not exist on type 'ApiResponse<T>'.

75             if (!responseData.success) {
                                 ~~~~~~~

client/src/services/api/apiClient.ts:77:34 - error TS2339: Property 'message' does not exist on type 'ApiResponse<T>'.

77                     responseData.message || 'Request failed',
                                    ~~~~~~~

client/src/services/api/apiClient.ts:81:47 - error TS2339: Property 'error' does not exist on type 'ApiResponse<T>'.

81                         details: responseData.error
                                                 ~~~~~

client/src/services/api/apiClient.ts:253:37 - error TS2339: Property 'message' does not exist on type 'ApiResponse<unknown>'.

253                 error.response.data.message || error.message || 'Request failed',
                                        ~~~~~~~

client/src/services/api/apiClient.ts:257:50 - error TS2339: Property 'error' does not exist on type 'ApiResponse<unknown>'.

257                     details: error.response.data.error
                                                     ~~~~~

client/src/services/api/apiUtils.ts:1:30 - error TS2307: Cannot find module '@/types/SharedParamsType' or its corresponding type declarations.

1 import SharedParamsType from '@/types/SharedParamsType';
                               ~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/services/api/apiUtils.ts:2:28 - error TS2307: Cannot find module '@/types/SharedArgsType' or its corresponding type declarations.

2 import SharedArgsType from '@/types/SharedArgsType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/services/api/apiUtils.ts:3:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

3 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/services/api/apiUtils.ts:34:24 - error TS2339: Property 'message' does not exist on type '{}'.

34         else if (data?.message) {
                          ~~~~~~~

client/src/services/api/apiUtils.ts:35:36 - error TS2339: Property 'message' does not exist on type '{}'.

35             return { message: data.message, status };
                                      ~~~~~~~

client/src/services/api/apiUtils.ts:37:24 - error TS2339: Property 'error' does not exist on type '{}'.

37         else if (data?.error) {
                          ~~~~~

client/src/services/api/apiUtils.ts:38:36 - error TS2339: Property 'error' does not exist on type '{}'.

38             return { message: data.error, status };
                                      ~~~~~

client/src/services/api/flightService.ts:1:40 - error TS2307: Cannot find module '@/types/SharedPassengerDetailsType' or its corresponding type declarations.

1 import SharedPassengerDetailsType from '@/types/SharedPassengerDetailsType';
                                         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/services/api/notificationService.ts:1:28 - error TS2307: Cannot find module '@/types/SharedDataType' or its corresponding type declarations.

1 import SharedDataType from '@/types/SharedDataType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/services/api/utils/error.ts:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/services/api/utils/error.ts:3:15 - error TS2305: Module '"@shared/types/api"' has no exported member 'RequestConfig'.

3 import type { RequestConfig, ApiErrorResponse } from '@shared/types/api';
                ~~~~~~~~~~~~~

client/src/services/api/utils/error.ts:3:30 - error TS2724: '"@shared/types/api"' has no exported member named 'ApiErrorResponse'. Did you mean 'ErrorResponse'?

3 import type { RequestConfig, ApiErrorResponse } from '@shared/types/api';
                               ~~~~~~~~~~~~~~~~

client/src/services/api/utils/request.ts:2:15 - error TS2305: Module '"@shared/types/api"' has no exported member 'RequestConfig'.

2 import type { RequestConfig, ApiResponse } from '@shared/types/api';
                ~~~~~~~~~~~~~

client/src/services/authService.ts:8:29 - error TS2305: Module '"@shared/types/auth"' has no exported member 'AuthUser'.

8 import type { AuthResponse, AuthUser } from '@shared/types/auth';
                              ~~~~~~~~

client/src/services/authService.ts:48:11 - error TS2353: Object literal may only specify known properties, and 'skipAuth' does not exist in type 'RequestConfig'.

48         { skipAuth: true }
             ~~~~~~~~

client/src/services/authService.ts:52:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

52         throw new AuthError(
                     ~~~~~~~~~

client/src/services/authService.ts:53:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

53           AuthErrorCode.VALIDATION_ERROR,
             ~~~~~~~~~~~~~

client/src/services/authService.ts:53:25 - error TS2339: Property 'VALIDATION_ERROR' does not exist on type 'typeof AuthErrorCode'.

53           AuthErrorCode.VALIDATION_ERROR,
                           ~~~~~~~~~~~~~~~~

client/src/services/authService.ts:58:41 - error TS2339: Property 'data' does not exist on type 'AuthResponse'.

58       const { user, tokens } = response.data.data;
                                           ~~~~

client/src/services/authService.ts:61:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

61         throw new AuthError(
                     ~~~~~~~~~

client/src/services/authService.ts:62:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

62           AuthErrorCode.VALIDATION_ERROR,
             ~~~~~~~~~~~~~

client/src/services/authService.ts:62:25 - error TS2339: Property 'VALIDATION_ERROR' does not exist on type 'typeof AuthErrorCode'.

62           AuthErrorCode.VALIDATION_ERROR,
                           ~~~~~~~~~~~~~~~~

client/src/services/authService.ts:68:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

68         throw new AuthError(
                     ~~~~~~~~~

client/src/services/authService.ts:69:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

69           AuthErrorCode.VALIDATION_ERROR,
             ~~~~~~~~~~~~~

client/src/services/authService.ts:69:25 - error TS2339: Property 'VALIDATION_ERROR' does not exist on type 'typeof AuthErrorCode'.

69           AuthErrorCode.VALIDATION_ERROR,
                           ~~~~~~~~~~~~~~~~

client/src/services/authService.ts:75:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

75         throw new AuthError(
                     ~~~~~~~~~

client/src/services/authService.ts:76:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

76           AuthErrorCode.INVALID_TOKEN,
             ~~~~~~~~~~~~~

client/src/services/authService.ts:85:28 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

85       if (error instanceof AuthError) {
                              ~~~~~~~~~

client/src/services/authService.ts:90:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

90         throw new AuthError(
                     ~~~~~~~~~

client/src/services/authService.ts:91:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

91           AuthErrorCode.INVALID_CREDENTIALS,
             ~~~~~~~~~~~~~

client/src/services/authService.ts:95:17 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

95       throw new AuthError(
                   ~~~~~~~~~

client/src/services/authService.ts:96:9 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

96         AuthErrorCode.UNKNOWN_ERROR,
           ~~~~~~~~~~~~~

client/src/services/authService.ts:110:11 - error TS2353: Object literal may only specify known properties, and 'skipAuth' does not exist in type 'RequestConfig'.

110         { skipAuth: true }
              ~~~~~~~~

client/src/services/authService.ts:113:22 - error TS2339: Property 'data' does not exist on type 'AuthResponse'.

113       if (!response?.data?.data) {
                         ~~~~

client/src/services/authService.ts:114:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

114         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:115:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

115           AuthErrorCode.VALIDATION_ERROR,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:115:25 - error TS2339: Property 'VALIDATION_ERROR' does not exist on type 'typeof AuthErrorCode'.

115           AuthErrorCode.VALIDATION_ERROR,
                            ~~~~~~~~~~~~~~~~

client/src/services/authService.ts:120:41 - error TS2339: Property 'data' does not exist on type 'AuthResponse'.

120       const { user, tokens } = response.data.data;
                                            ~~~~

client/src/services/authService.ts:123:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

123         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:124:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

124           AuthErrorCode.VALIDATION_ERROR,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:124:25 - error TS2339: Property 'VALIDATION_ERROR' does not exist on type 'typeof AuthErrorCode'.

124           AuthErrorCode.VALIDATION_ERROR,
                            ~~~~~~~~~~~~~~~~

client/src/services/authService.ts:130:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

130         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:131:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

131           AuthErrorCode.VALIDATION_ERROR,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:131:25 - error TS2339: Property 'VALIDATION_ERROR' does not exist on type 'typeof AuthErrorCode'.

131           AuthErrorCode.VALIDATION_ERROR,
                            ~~~~~~~~~~~~~~~~

client/src/services/authService.ts:137:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

137         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:138:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

138           AuthErrorCode.INVALID_TOKEN,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:148:28 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

148       if (error instanceof AuthError) {
                               ~~~~~~~~~

client/src/services/authService.ts:154:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

154         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:155:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

155           AuthErrorCode.VALIDATION_ERROR,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:155:25 - error TS2339: Property 'VALIDATION_ERROR' does not exist on type 'typeof AuthErrorCode'.

155           AuthErrorCode.VALIDATION_ERROR,
                            ~~~~~~~~~~~~~~~~

client/src/services/authService.ts:160:17 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

160       throw new AuthError(
                    ~~~~~~~~~

client/src/services/authService.ts:161:9 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

161         AuthErrorCode.UNKNOWN_ERROR,
            ~~~~~~~~~~~~~

client/src/services/authService.ts:177:11 - error TS2353: Object literal may only specify known properties, and 'skipAuth' does not exist in type 'RequestConfig'.

177         { skipAuth: true, withCredentials: true }
              ~~~~~~~~

client/src/services/authService.ts:197:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

197         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:198:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

198           AuthErrorCode.UNAUTHORIZED,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:198:25 - error TS2339: Property 'UNAUTHORIZED' does not exist on type 'typeof AuthErrorCode'.

198           AuthErrorCode.UNAUTHORIZED,
                            ~~~~~~~~~~~~

client/src/services/authService.ts:206:11 - error TS2353: Object literal may only specify known properties, and 'skipAuth' does not exist in type 'RequestConfig'.

206         { skipAuth: true, withCredentials: true }
              ~~~~~~~~

client/src/services/authService.ts:210:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

210         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:211:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

211           AuthErrorCode.INVALID_TOKEN,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:219:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

219         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:220:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

220           AuthErrorCode.INVALID_TOKEN,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:240:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

240         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:241:41 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

241           errorCode as AuthErrorCode || AuthErrorCode.UNAUTHORIZED,
                                            ~~~~~~~~~~~~~

client/src/services/authService.ts:241:55 - error TS2339: Property 'UNAUTHORIZED' does not exist on type 'typeof AuthErrorCode'.

241           errorCode as AuthErrorCode || AuthErrorCode.UNAUTHORIZED,
                                                          ~~~~~~~~~~~~

client/src/services/authService.ts:246:28 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

246       if (error instanceof AuthError) {
                               ~~~~~~~~~

client/src/services/authService.ts:250:17 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

250       throw new AuthError(
                    ~~~~~~~~~

client/src/services/authService.ts:251:9 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

251         AuthErrorCode.UNKNOWN_ERROR,
            ~~~~~~~~~~~~~

client/src/services/authService.ts:265:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

265         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:266:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

266           AuthErrorCode.USER_NOT_FOUND,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:274:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

274         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:275:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

275           AuthErrorCode.VALIDATION_ERROR,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:275:25 - error TS2339: Property 'VALIDATION_ERROR' does not exist on type 'typeof AuthErrorCode'.

275           AuthErrorCode.VALIDATION_ERROR,
                            ~~~~~~~~~~~~~~~~

client/src/services/authService.ts:291:21 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

291           throw new AuthError(
                        ~~~~~~~~~

client/src/services/authService.ts:292:13 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

292             AuthErrorCode.UNAUTHORIZED,
                ~~~~~~~~~~~~~

client/src/services/authService.ts:292:27 - error TS2339: Property 'UNAUTHORIZED' does not exist on type 'typeof AuthErrorCode'.

292             AuthErrorCode.UNAUTHORIZED,
                              ~~~~~~~~~~~~

client/src/services/authService.ts:298:28 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

298       if (error instanceof AuthError) {
                               ~~~~~~~~~

client/src/services/authService.ts:302:17 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

302       throw new AuthError(
                    ~~~~~~~~~

client/src/services/authService.ts:303:9 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

303         AuthErrorCode.UNKNOWN_ERROR,
            ~~~~~~~~~~~~~

client/src/services/authService.ts:321:11 - error TS2353: Object literal may only specify known properties, and 'skipAuth' does not exist in type 'RequestConfig'.

321         { skipAuth: true }
              ~~~~~~~~

client/src/services/authService.ts:325:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

325         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:326:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

326           AuthErrorCode.UNKNOWN_ERROR,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:339:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

339         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:340:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

340           AuthErrorCode.UNKNOWN_ERROR,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:345:28 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

345       if (error instanceof AuthError) {
                               ~~~~~~~~~

client/src/services/authService.ts:349:17 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

349       throw new AuthError(
                    ~~~~~~~~~

client/src/services/authService.ts:350:9 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

350         AuthErrorCode.UNKNOWN_ERROR,
            ~~~~~~~~~~~~~

client/src/services/authService.ts:371:11 - error TS2353: Object literal may only specify known properties, and 'skipAuth' does not exist in type 'RequestConfig'.

371         { skipAuth: true }
              ~~~~~~~~

client/src/services/authService.ts:375:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

375         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:376:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

376           AuthErrorCode.VALIDATION_ERROR,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:376:25 - error TS2339: Property 'VALIDATION_ERROR' does not exist on type 'typeof AuthErrorCode'.

376           AuthErrorCode.VALIDATION_ERROR,
                            ~~~~~~~~~~~~~~~~

client/src/services/authService.ts:384:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

384         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:385:11 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

385           AuthErrorCode.USER_NOT_FOUND,
              ~~~~~~~~~~~~~

client/src/services/authService.ts:405:19 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

405         throw new AuthError(
                      ~~~~~~~~~

client/src/services/authService.ts:406:24 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

406           errorCode || AuthErrorCode.UNKNOWN_ERROR,
                           ~~~~~~~~~~~~~

client/src/services/authService.ts:412:28 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

412       if (error instanceof AuthError) {
                               ~~~~~~~~~

client/src/services/authService.ts:416:17 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

416       throw new AuthError(
                    ~~~~~~~~~

client/src/services/authService.ts:417:9 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

417         AuthErrorCode.UNKNOWN_ERROR,
            ~~~~~~~~~~~~~

client/src/services/authService.ts:430:15 - error TS2305: Module '"@shared/types/auth"' has no exported member 'AuthUser'.

430 export type { AuthUser, AuthResponse } from '@shared/types/auth';
                  ~~~~~~~~

client/src/services/hotelService.ts:1:36 - error TS2307: Cannot find module '@/types/SharedTravelerInfoType' or its corresponding type declarations.

1 import SharedTravelerInfoType from '@/types/SharedTravelerInfoType';
                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/types/activity.ts:6:8 - error TS2305: Module '"@shared/types/activity"' has no exported member 'ClientActivity'.

6   type ClientActivity,
         ~~~~~~~~~~~~~~

client/src/types/activity.ts:7:8 - error TS2300: Duplicate identifier 'ActivityFormValues'.

7   type ActivityFormValues,
         ~~~~~~~~~~~~~~~~~~

client/src/types/activity.ts:7:8 - error TS2305: Module '"@shared/types/activity"' has no exported member 'ActivityFormValues'.

7   type ActivityFormValues,
         ~~~~~~~~~~~~~~~~~~

client/src/types/activity.ts:8:8 - error TS2305: Module '"@shared/types/activity"' has no exported member 'ActivityModalProps'.

8   type ActivityModalProps,
         ~~~~~~~~~~~~~~~~~~

client/src/types/activity.ts:9:3 - error TS2305: Module '"@shared/types/activity"' has no exported member 'activityFormSchema'.

9   activityFormSchema as activitySchema,
    ~~~~~~~~~~~~~~~~~~

client/src/types/activity.ts:10:3 - error TS2724: '"@shared/types/activity"' has no exported member named 'isActivity'. Did you mean 'Activity'?

10   isActivity,
     ~~~~~~~~~~

client/src/types/activity.ts:11:3 - error TS2305: Module '"@shared/types/activity"' has no exported member 'isClientActivity'.

11   isClientActivity
     ~~~~~~~~~~~~~~~~

client/src/types/activity.ts:16:15 - error TS2300: Duplicate identifier 'ActivityFormValues'.

16 export type { ActivityFormValues };
                 ~~~~~~~~~~~~~~~~~~

client/src/types/activity.ts:16:15 - error TS2304: Cannot find name 'ActivityFormValues'.

16 export type { ActivityFormValues };
                 ~~~~~~~~~~~~~~~~~~

client/src/types/activity.ts:24:14 - error TS2304: Cannot find name 'ClientActivity'.

24   activity?: ClientActivity;
                ~~~~~~~~~~~~~~

client/src/types/api-client.ts:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/types/api-client.ts:97:27 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

97   return error instanceof AuthError;
                             ~~~~~~~~~

client/src/utils/errorUtils.ts:1:29 - error TS2307: Cannot find module '@/types/SharedErrorType' or its corresponding type declarations.

1 import SharedErrorType from '@/types/SharedErrorType';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/utils/errorUtils.ts:46:27 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

46   return error instanceof AuthError;
                             ~~~~~~~~~

client/src/utils/errorUtils.ts:63:25 - error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.

63   code: AuthErrorCode = AuthErrorCode.UNKNOWN_ERROR,
                           ~~~~~~~~~~~~~

client/src/utils/errorUtils.ts:66:14 - error TS2693: 'AuthError' only refers to a type, but is being used as a value here.

66   return new AuthError(code, message, details);
                ~~~~~~~~~

client/src/utils/inputValidator.ts:1:28 - error TS2307: Cannot find module '@/types/SharedDataType' or its corresponding type declarations.

1 import SharedDataType from '@/types/SharedDataType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/utils/memoization.ts:1:25 - error TS2307: Cannot find module '@/types/SharedBType' or its corresponding type declarations.

1 import SharedBType from '@/types/SharedBType';
                          ~~~~~~~~~~~~~~~~~~~~~

client/src/utils/memoization.ts:2:25 - error TS2307: Cannot find module '@/types/SharedAType' or its corresponding type declarations.

2 import SharedAType from '@/types/SharedAType';
                          ~~~~~~~~~~~~~~~~~~~~~

client/src/utils/memoization.ts:3:28 - error TS2307: Cannot find module '@/types/SharedDepsType' or its corresponding type declarations.

3 import SharedDepsType from '@/types/SharedDepsType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/utils/memoization.ts:4:28 - error TS2307: Cannot find module '@/types/SharedArgsType' or its corresponding type declarations.

4 import SharedArgsType from '@/types/SharedArgsType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

client/src/utils/performance.ts:1:36 - error TS2307: Cannot find module '@/types/SharedDependenciesType' or its corresponding type declarations.

1 import SharedDependenciesType from '@/types/SharedDependenciesType';
                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

client/src/utils/performance.ts:2:28 - error TS2307: Cannot find module '@/types/SharedArgsType' or its corresponding type declarations.

2 import SharedArgsType from '@/types/SharedArgsType';
                             ~~~~~~~~~~~~~~~~~~~~~~~~

server/db.ts:7:35 - error TS2307: Cannot find module './db/superadminSchema.js' or its corresponding type declarations.

7 import * as superadminSchema from './db/superadminSchema.js';
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/db.ts:4:32 - error TS2307: Cannot find module './invoiceSchema.js' or its corresponding type declarations.

4 import * as invoiceSchema from './invoiceSchema.js';
                                 ~~~~~~~~~~~~~~~~~~~~

server/db/db.ts:5:33 - error TS2307: Cannot find module './proposalSchema.js' or its corresponding type declarations.

5 import * as proposalSchema from './proposalSchema.js';
                                  ~~~~~~~~~~~~~~~~~~~~~

server/db/db.ts:6:35 - error TS2307: Cannot find module './superadminSchema.js' or its corresponding type declarations.

6 import * as superadminSchema from './superadminSchema.js';
                                    ~~~~~~~~~~~~~~~~~~~~~~~

server/db/db.ts:7:32 - error TS2307: Cannot find module './bookingSchema.js' or its corresponding type declarations.

7 import * as bookingSchema from './bookingSchema.js';
                                 ~~~~~~~~~~~~~~~~~~~~

server/db/index.ts:5:15 - error TS2307: Cannot find module './approvalSchema.js' or its corresponding type declarations.

5 export * from './approvalSchema.js';
                ~~~~~~~~~~~~~~~~~~~~~

server/db/index.ts:25:8 - error TS2307: Cannot find module './superadminSchema.js' or its corresponding type declarations.

25 } from './superadminSchema.js';
          ~~~~~~~~~~~~~~~~~~~~~~~

server/db/index.ts:31:3 - error TS2305: Module '"./schema.js"' has no exported member 'Trip'.

31   Trip, NewTrip,
     ~~~~

server/db/index.ts:31:9 - error TS2305: Module '"./schema.js"' has no exported member 'NewTrip'.

31   Trip, NewTrip,
           ~~~~~~~

server/db/index.ts:32:3 - error TS2305: Module '"./schema.js"' has no exported member 'Activity'.

32   Activity, NewActivity,
     ~~~~~~~~

server/db/index.ts:32:13 - error TS2305: Module '"./schema.js"' has no exported member 'NewActivity'.

32   Activity, NewActivity,
               ~~~~~~~~~~~

server/db/index.ts:33:3 - error TS2305: Module '"./schema.js"' has no exported member 'Todo'.

33   Todo, NewTodo,
     ~~~~

server/db/index.ts:33:9 - error TS2305: Module '"./schema.js"' has no exported member 'NewTodo'.

33   Todo, NewTodo,
           ~~~~~~~

server/db/index.ts:34:3 - error TS2724: '"./schema.js"' has no exported member named 'Note'. Did you mean 'not'?

34   Note, NewNote,
     ~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/drizzle-orm@0.44.2_@libsql+_03d5df1ca471aea61fb614da580bafc3/node_modules/drizzle-orm/sql/expressions/conditions.d.ts:92:25
    92 export declare function not(condition: SQLWrapper): SQL;
                               ~~~
    'not' is declared here.

server/db/index.ts:34:9 - error TS2305: Module '"./schema.js"' has no exported member 'NewNote'.

34   Note, NewNote,
           ~~~~~~~

server/db/index.ts:43:8 - error TS2307: Cannot find module './approvalSchema.js' or its corresponding type declarations.

43 } from './approvalSchema.js';
          ~~~~~~~~~~~~~~~~~~~~~

server/db/index.ts:48:3 - error TS2305: Module '"./schema.js"' has no exported member 'USER_ROLES'.

48   USER_ROLES
     ~~~~~~~~~~

server/db/index.ts:54:8 - error TS2307: Cannot find module './approvalSchema.js' or its corresponding type declarations.

54 } from './approvalSchema.js';
          ~~~~~~~~~~~~~~~~~~~~~

server/db/index.ts:57:3 - error TS2305: Module '"./schema.js"' has no exported member 'organizationPlanEnum'.

57   organizationPlanEnum
     ~~~~~~~~~~~~~~~~~~~~

server/db/index.ts:62:3 - error TS2305: Module '"./schema.js"' has no exported member 'insertUserSchema'.

62   insertUserSchema,
     ~~~~~~~~~~~~~~~~

server/db/index.ts:63:3 - error TS2305: Module '"./schema.js"' has no exported member 'selectUserSchema'.

63   selectUserSchema,
     ~~~~~~~~~~~~~~~~

server/db/index.ts:74:8 - error TS2307: Cannot find module './approvalSchema.js' or its corresponding type declarations.

74 } from './approvalSchema.js';
          ~~~~~~~~~~~~~~~~~~~~~

server/db/index.ts:86:8 - error TS2307: Cannot find module './superadminSchema.js' or its corresponding type declarations.

86 } from './superadminSchema.js';
          ~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/activities/activities.ts:42:10 - error TS2304: Cannot find name 'integer'.

42   order: integer('order').default(0),
            ~~~~~~~

server/db/schema/activities/activities.ts:43:14 - error TS2693: 'boolean' only refers to a type, but is being used as a value here.

43   completed: boolean('completed').default(false),
                ~~~~~~~

server/db/schema/approvals/approval-logs.ts:3:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

3 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/approvals/approval-logs.ts:4:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/approvals/approval-logs.ts:5:34 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './approval-requests.js'?

5 import { approvalRequests } from './approval-requests';
                                   ~~~~~~~~~~~~~~~~~~~~~

server/db/schema/approvals/approval-logs.ts:6:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

6 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/approvals/approval-logs.ts:48:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

48   action: (schema) => schema.action.min(1).max(100),
              ~~~~~~

server/db/schema/approvals/approval-logs.ts:49:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

49   status: (schema) => schema.status.min(1).max(50),
              ~~~~~~

server/db/schema/approvals/approval-logs.ts:50:13 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

50   message: (schema) => schema.message.optional(),
               ~~~~~~

server/db/schema/approvals/approval-logs.ts:51:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

51   metadata: (schema) => schema.metadata.optional(),
                ~~~~~~

server/db/schema/approvals/approval-logs.ts:52:13 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

52   context: (schema) => schema.context.optional(),
               ~~~~~~

server/db/schema/approvals/approval-requests.ts:3:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

3 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/approvals/approval-requests.ts:4:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/approvals/approval-requests.ts:5:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './approval-rules.js'?

5 import { approvalRules } from './approval-rules';
                                ~~~~~~~~~~~~~~~~~~

server/db/schema/approvals/approval-requests.ts:6:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

6 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/approvals/approval-requests.ts:9:58 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './approval-rules.js'?

9 export { approvalStatusEnum, approvalPriorityEnum } from './approval-rules';
                                                           ~~~~~~~~~~~~~~~~~~

server/db/schema/approvals/approval-requests.ts:10:55 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './approval-rules.js'?

10 export type { ApprovalStatus, ApprovalPriority } from './approval-rules';
                                                         ~~~~~~~~~~~~~~~~~~

server/db/schema/approvals/approval-requests.ts:31:32 - error TS2304: Cannot find name 'ApprovalStatus'.

31   status: text('status').$type<ApprovalStatus>().notNull().default('pending'),
                                  ~~~~~~~~~~~~~~

server/db/schema/approvals/approval-requests.ts:32:36 - error TS2304: Cannot find name 'ApprovalPriority'.

32   priority: text('priority').$type<ApprovalPriority>().notNull().default('normal'),
                                      ~~~~~~~~~~~~~~~~

server/db/schema/approvals/approval-requests.ts:36:16 - error TS2304: Cannot find name 'integer'.

36   currentStep: integer('current_step').default(1),
                  ~~~~~~~

server/db/schema/approvals/approval-requests.ts:37:15 - error TS2304: Cannot find name 'integer'.

37   totalSteps: integer('total_steps').default(1),
                 ~~~~~~~

server/db/schema/approvals/approval-requests.ts:65:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

65   entityType: (schema) => schema.entityType.min(1).max(100),
                  ~~~~~~

server/db/schema/approvals/approval-requests.ts:66:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

66   entityId: (schema) => schema.entityId.min(1).max(255),
                ~~~~~~

server/db/schema/approvals/approval-requests.ts:67:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

67   status: (schema) => schema.status.optional(),
              ~~~~~~

server/db/schema/approvals/approval-requests.ts:68:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

68   priority: (schema) => schema.priority.optional(),
                ~~~~~~

server/db/schema/approvals/approval-requests.ts:69:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

69   currentStep: (schema) => schema.currentStep.min(1).default(1),
                   ~~~~~~

server/db/schema/approvals/approval-requests.ts:70:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

70   totalSteps: (schema) => schema.totalSteps.min(1).default(1),
                  ~~~~~~

server/db/schema/approvals/approval-requests.ts:71:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

71   requestData: (schema) => schema.requestData.default({}),
                   ~~~~~~

server/db/schema/approvals/approval-requests.ts:72:18 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

72   decisionData: (schema) => schema.decisionData.optional(),
                    ~~~~~~

server/db/schema/approvals/approval-requests.ts:73:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

73   metadata: (schema) => schema.metadata.optional(),
                ~~~~~~

server/db/schema/approvals/approval-rules.ts:3:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

3 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/approvals/approval-rules.ts:4:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

4 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/approvals/approval-rules.ts:42:10 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

42   name: (schema) => schema.name.min(1).max(255),
            ~~~~~~

server/db/schema/approvals/approval-rules.ts:43:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

43   description: (schema) => schema.description.optional(),
                   ~~~~~~

server/db/schema/approvals/approval-rules.ts:44:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

44   entityType: (schema) => schema.entityType.min(1).max(100),
                  ~~~~~~

server/db/schema/approvals/approval-rules.ts:45:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

45   conditions: (schema) => schema.conditions.optional(),
                  ~~~~~~

server/db/schema/approvals/approval-rules.ts:46:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

46   autoApprove: (schema) => schema.autoApprove.default(false),
                   ~~~~~~

server/db/schema/approvals/approval-rules.ts:47:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

47   isActive: (schema) => schema.isActive.default(true),
                ~~~~~~

server/db/schema/approvals/approval-rules.ts:48:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

48   priority: (schema) => schema.priority.min(0).default(0),
                ~~~~~~

server/db/schema/audit/index.ts:2:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './audit-logs.js'?

2 export * from './audit-logs';
                ~~~~~~~~~~~~~~

server/db/schema/audit/index.ts:3:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './admin-audit-logs.js'?

3 export * from './admin-audit-logs';
                ~~~~~~~~~~~~~~~~~~~~

server/db/schema/audit/index.ts:4:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './user-activity-logs.js'?

4 export * from './user-activity-logs';
                ~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/audit/user-activity-logs.ts:4:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/audit/user-activity-logs.ts:5:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

5 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/audit/user-activity-logs.ts:47:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

47   action: (schema) => schema.action.min(1).max(100),
              ~~~~~~

server/db/schema/audit/user-activity-logs.ts:48:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

48   entityType: (schema) => schema.entityType.min(1).max(100).optional(),
                  ~~~~~~

server/db/schema/billing/card-transactions.ts:3:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

3 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/billing/card-transactions.ts:4:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/billing/card-transactions.ts:5:23 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../trips/trips.js'?

5 import { trips } from '../trips/trips';
                        ~~~~~~~~~~~~~~~~

server/db/schema/billing/card-transactions.ts:6:32 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './corporate-cards.js'?

6 import { corporateCards } from './corporate-cards';
                                 ~~~~~~~~~~~~~~~~~~~

server/db/schema/billing/card-transactions.ts:7:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

7 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/billing/card-transactions.ts:43:16 - error TS2693: 'boolean' only refers to a type, but is being used as a value here.

43   isRecurring: boolean('is_recurring').default(false),
                  ~~~~~~~

server/db/schema/billing/card-transactions.ts:44:20 - error TS2693: 'boolean' only refers to a type, but is being used as a value here.

44   isInternational: boolean('is_international').default(false),
                      ~~~~~~~

server/db/schema/billing/card-transactions.ts:45:13 - error TS2693: 'boolean' only refers to a type, but is being used as a value here.

45   isOnline: boolean('is_online').default(false),
               ~~~~~~~

server/db/schema/billing/card-transactions.ts:84:18 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

84   merchantName: (schema) => schema.merchantName.min(1).max(255),
                    ~~~~~~

server/db/schema/billing/card-transactions.ts:85:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

85   amount: (schema) => schema.amount.min(0),
              ~~~~~~

server/db/schema/billing/card-transactions.ts:86:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

86   currency: (schema) => schema.currency.length(3),
                ~~~~~~

server/db/schema/billing/card-transactions.ts:87:20 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

87   originalAmount: (schema) => schema.originalAmount.optional(),
                      ~~~~~~

server/db/schema/billing/card-transactions.ts:88:22 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

88   originalCurrency: (schema) => schema.originalCurrency.length(3).optional(),
                        ~~~~~~

server/db/schema/billing/card-transactions.ts:89:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

89   status: (schema) => schema.status.default('pending'),
              ~~~~~~

server/db/schema/billing/card-transactions.ts:90:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

90   metadata: (schema) => schema.metadata.optional(),
                ~~~~~~

server/db/schema/billing/card-transactions.ts:91:13 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

91   context: (schema) => schema.context.optional(),
               ~~~~~~

server/db/schema/billing/corporate-cards.ts:3:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

3 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/billing/corporate-cards.ts:4:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/billing/corporate-cards.ts:5:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

5 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/billing/corporate-cards.ts:62:20 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

62   lastFourDigits: (schema) => schema.lastFourDigits.length(4),
                      ~~~~~~

server/db/schema/billing/corporate-cards.ts:63:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

63   expiryMonth: (schema) => schema.expiryMonth.min(1).max(12),
                   ~~~~~~

server/db/schema/billing/corporate-cards.ts:64:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

64   expiryYear: (schema) => schema.expiryYear.min(2000).max(2100),
                  ~~~~~~

server/db/schema/billing/corporate-cards.ts:65:20 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

65   cardholderName: (schema) => schema.cardholderName.min(1).max(255),
                      ~~~~~~

server/db/schema/billing/corporate-cards.ts:66:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

66   cardType: (schema) => schema.cardType.optional(),
                ~~~~~~

server/db/schema/billing/corporate-cards.ts:67:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

67   status: (schema) => schema.status.default('active'),
              ~~~~~~

server/db/schema/billing/corporate-cards.ts:68:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

68   isVirtual: (schema) => schema.isVirtual.default(false),
                 ~~~~~~

server/db/schema/billing/corporate-cards.ts:69:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

69   isDefault: (schema) => schema.isDefault.default(false),
                 ~~~~~~

server/db/schema/billing/corporate-cards.ts:70:19 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

70   spendingLimit: (schema) => schema.spendingLimit.optional(),
                     ~~~~~~

server/db/schema/billing/corporate-cards.ts:71:20 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

71   currentBalance: (schema) => schema.currentBalance.default(0),
                      ~~~~~~

server/db/schema/billing/corporate-cards.ts:72:22 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

72   availableBalance: (schema) => schema.availableBalance.default(0),
                        ~~~~~~

server/db/schema/billing/corporate-cards.ts:73:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

73   metadata: (schema) => schema.metadata.optional(),
                ~~~~~~

server/db/schema/billing/corporate-cards.ts:74:13 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

74   context: (schema) => schema.context.optional(),
               ~~~~~~

server/db/schema/billing/index.ts:2:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './subscriptions.js'?

2 export * from './subscriptions';
                ~~~~~~~~~~~~~~~~~

server/db/schema/billing/index.ts:3:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './invoices.js'?

3 export * from './invoices';
                ~~~~~~~~~~~~

server/db/schema/billing/index.ts:4:15 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 export * from './payment-methods';
                ~~~~~~~~~~~~~~~~~~~

server/db/schema/billing/index.ts:5:15 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

5 export * from './usage';
                ~~~~~~~~~

server/db/schema/billing/index.ts:6:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './corporate-cards.js'?

6 export * from './corporate-cards';
                ~~~~~~~~~~~~~~~~~~~

server/db/schema/billing/index.ts:7:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './card-transactions.js'?

7 export * from './card-transactions';
                ~~~~~~~~~~~~~~~~~~~~~

server/db/schema/billing/subscriptions.ts:4:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

4 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/billing/subscriptions.ts:5:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

5 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/billing/subscriptions.ts:6:23 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../enums.js'?

6 import { enums } from '../enums';
                        ~~~~~~~~~~

server/db/schema/billing/subscriptions.ts:7:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../shared/types.js'?

7 import type { Metadata } from '../shared/types';
                                ~~~~~~~~~~~~~~~~~

server/db/schema/billing/subscriptions.ts:17:13 - error TS2304: Cannot find name 'integer'.

17   quantity: integer('quantity'),
               ~~~~~~~

server/db/schema/billing/subscriptions.ts:36:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

36   status: (schema) => schema.status.regex(/^(incomplete|incomplete_expired|trialing|active|past_due|canceled|unpaid)$/),
              ~~~~~~

server/db/schema/billing/subscriptions.ts:37:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

37   quantity: (schema) => schema.quantity.min(1).optional(),
                ~~~~~~

server/db/schema/bookings/bookings.ts:20:42 - error TS2307: Cannot find module '../../../../shared/utils/schema-utils.js' or its corresponding type declarations.

20 import { toCamelCase, toSnakeCase } from '../../../../shared/utils/schema-utils.js';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/bookings/index.ts:2:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './bookings.js'?

2 export * from './bookings';
                ~~~~~~~~~~~~

server/db/schema/expenses/budgets.ts:5:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

5 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/expenses/budgets.ts:6:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

6 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/expenses/budgets.ts:7:23 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../trips/trips.js'?

7 import { trips } from '../trips/trips';
                        ~~~~~~~~~~~~~~~~

server/db/schema/expenses/budgets.ts:8:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

8 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/expenses/budgets.ts:9:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../shared/types.js'?

9 import type { Metadata } from '../shared/types';
                                ~~~~~~~~~~~~~~~~~

server/db/schema/expenses/budgets.ts:26:13 - error TS2693: 'boolean' only refers to a type, but is being used as a value here.

26   isActive: boolean('is_active').notNull().default(true),
               ~~~~~~~

server/db/schema/expenses/budgets.ts:33:10 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

33   name: (schema) => schema.name.min(1).max(200),
            ~~~~~~

server/db/schema/expenses/budgets.ts:34:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

34   description: (schema) => schema.description.max(1000).optional(),
                   ~~~~~~

server/db/schema/expenses/budgets.ts:35:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

35   amount: (schema) => schema.amount.min(0.01),
              ~~~~~~

server/db/schema/expenses/budgets.ts:36:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

36   currency: (schema) => schema.currency.length(3),
                ~~~~~~

server/db/schema/expenses/expense-categories.ts:4:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

4 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/expenses/expense-categories.ts:5:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

5 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/expenses/expense-categories.ts:6:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../shared/types.js'?

6 import type { Metadata } from '../shared/types';
                                ~~~~~~~~~~~~~~~~~

server/db/schema/expenses/expense-categories.ts:8:14 - error TS7022: 'expenseCategories' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer.

8 export const expenseCategories = pgTable('expense_categories', {
               ~~~~~~~~~~~~~~~~~

server/db/schema/expenses/expense-categories.ts:17:13 - error TS2693: 'boolean' only refers to a type, but is being used as a value here.

17   isActive: boolean('is_active').notNull().default(true),
               ~~~~~~~

server/db/schema/expenses/expense-categories.ts:18:13 - error TS2693: 'boolean' only refers to a type, but is being used as a value here.

18   isSystem: boolean('is_system').notNull().default(false),
               ~~~~~~~

server/db/schema/expenses/expense-categories.ts:19:69 - error TS7024: Function implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions.

19   parentId: uuid('parent_id').references(/* istanbul ignore next */ () => expenseCategories.id, {
                                                                       ~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/expenses/expense-categories.ts:30:10 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

30   name: (schema) => schema.name.min(1).max(100),
            ~~~~~~

server/db/schema/expenses/expense-categories.ts:31:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

31   description: (schema) => schema.description.max(500).optional(),
                   ~~~~~~

server/db/schema/expenses/expense-categories.ts:32:10 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

32   icon: (schema) => schema.icon.optional(),
            ~~~~~~

server/db/schema/expenses/expense-categories.ts:33:11 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

33   color: (schema) => schema.color.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
             ~~~~~~

server/db/schema/expenses/expenses.ts:5:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

5 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/expenses/expenses.ts:6:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

6 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/expenses/expenses.ts:7:23 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../trips/trips.js'?

7 import { trips } from '../trips/trips';
                        ~~~~~~~~~~~~~~~~

server/db/schema/expenses/expenses.ts:8:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

8 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/expenses/expenses.ts:9:23 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../enums.js'?

9 import { enums } from '../enums';
                        ~~~~~~~~~~

server/db/schema/expenses/expenses.ts:10:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../shared/types.js'?

10 import type { Metadata } from '../shared/types';
                                 ~~~~~~~~~~~~~~~~~

server/db/schema/expenses/expenses.ts:36:11 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

36   title: (schema) => schema.title.min(1).max(200),
             ~~~~~~

server/db/schema/expenses/expenses.ts:37:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

37   description: (schema) => schema.description.max(1000).optional(),
                   ~~~~~~

server/db/schema/expenses/expenses.ts:38:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

38   amount: (schema) => schema.amount.min(0.01),
              ~~~~~~

server/db/schema/expenses/expenses.ts:39:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

39   currency: (schema) => schema.currency.length(3),
                ~~~~~~

server/db/schema/expenses/expenses.ts:40:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

40   status: (schema) => schema.status.regex(/^(pending|approved|rejected|paid|reimbursed)$/),
              ~~~~~~

server/db/schema/expenses/expenses.ts:41:19 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

41   paymentMethod: (schema) => schema.paymentMethod.optional(),
                     ~~~~~~

server/db/schema/expenses/index.ts:2:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './expenses.js'?

2 export * from './expenses';
                ~~~~~~~~~~~~

server/db/schema/expenses/index.ts:3:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './budgets.js'?

3 export * from './budgets';
                ~~~~~~~~~~~

server/db/schema/expenses/index.ts:4:15 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 export * from './receipts';
                ~~~~~~~~~~~~

server/db/schema/expenses/index.ts:5:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './expense-categories.js'?

5 export * from './expense-categories';
                ~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/files/file-permissions.ts:4:23 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './files.js'?

4 import { files } from './files';
                        ~~~~~~~~~

server/db/schema/files/file-permissions.ts:5:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

5 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/files/file-permissions.ts:6:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

6 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/files/file-permissions.ts:7:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

7 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/files/file-permissions.ts:43:14 - error TS2304: Cannot find name 'index'.

43   fileIdIdx: index('file_permission_file_id_idx').on(table.fileId),
                ~~~~~

server/db/schema/files/file-permissions.ts:44:14 - error TS2304: Cannot find name 'index'.

44   userIdIdx: index('file_permission_user_id_idx').on(table.userId),
                ~~~~~

server/db/schema/files/file-permissions.ts:45:13 - error TS2304: Cannot find name 'index'.

45   orgIdIdx: index('file_permission_org_id_idx').on(table.organizationId),
               ~~~~~

server/db/schema/files/file-permissions.ts:50:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

50   permission: (schema) => schema.permission.oneOf([...filePermissionTypes]),
                  ~~~~~~

server/db/schema/files/file-uploads.ts:4:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/files/file-uploads.ts:5:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

5 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/files/file-uploads.ts:6:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

6 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/files/file-uploads.ts:7:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../shared/types.js'?

7 import type { Metadata } from '../shared/types';
                                ~~~~~~~~~~~~~~~~~

server/db/schema/files/file-uploads.ts:19:13 - error TS2304: Cannot find name 'integer'.

19   fileSize: integer('file_size'), // in bytes
               ~~~~~~~

server/db/schema/files/file-uploads.ts:22:13 - error TS2304: Cannot find name 'integer'.

22   progress: integer('progress').notNull().default(0), // 0-100
               ~~~~~~~

server/db/schema/files/file-uploads.ts:45:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

45   fileName: (schema) => schema.fileName.min(1).max(255),
                ~~~~~~

server/db/schema/files/file-uploads.ts:46:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

46   fileType: (schema) => schema.fileType.min(1).max(100).optional(),
                ~~~~~~

server/db/schema/files/file-uploads.ts:47:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

47   fileSize: (schema) => schema.fileSize.min(0).optional(),
                ~~~~~~

server/db/schema/files/file-uploads.ts:48:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

48   status: (schema) => schema.status.regex(/^(pending|uploading|completed|failed)$/),
              ~~~~~~

server/db/schema/files/file-uploads.ts:49:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

49   progress: (schema) => schema.progress.min(0).max(100),
                ~~~~~~

server/db/schema/files/file-uploads.ts:50:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

50   storageKey: (schema) => schema.storageKey.min(1).max(255).optional(),
                  ~~~~~~

server/db/schema/files/files.ts:4:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/files/files.ts:5:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

5 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/files/files.ts:6:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

6 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/files/files.ts:7:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../shared/types.js'?

7 import type { Metadata } from '../shared/types';
                                ~~~~~~~~~~~~~~~~~

server/db/schema/files/files.ts:29:13 - error TS2693: 'boolean' only refers to a type, but is being used as a value here.

29   isPublic: boolean('is_public').notNull().default(false),
               ~~~~~~~

server/db/schema/files/files.ts:41:10 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

41   name: (schema) => schema.name.min(1).max(255),
            ~~~~~~

server/db/schema/files/files.ts:42:9 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

42   key: (schema) => schema.key.min(1).max(255),
           ~~~~~~

server/db/schema/files/files.ts:43:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

43   mimeType: (schema) => schema.mimeType.min(1).max(100).optional(),
                ~~~~~~

server/db/schema/files/files.ts:44:10 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

44   size: (schema) => schema.size.min(0),
            ~~~~~~

server/db/schema/files/files.ts:45:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

45   entityType: (schema) => schema.entityType.min(1).max(100).optional(),
                  ~~~~~~

server/db/schema/files/index.ts:2:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './files.js'?

2 export * from './files';
                ~~~~~~~~~

server/db/schema/files/index.ts:3:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './file-uploads.js'?

3 export * from './file-uploads';
                ~~~~~~~~~~~~~~~~

server/db/schema/files/index.ts:4:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './file-permissions.js'?

4 export * from './file-permissions';
                ~~~~~~~~~~~~~~~~~~~~

server/db/schema/index.ts:6:15 - error TS2307: Cannot find module '../../shared/types.js' or its corresponding type declarations.

6 export * from '../../shared/types.js';
                ~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/index.ts:26:3 - error TS2305: Module '"drizzle-orm/pg-core"' has no exported member 'sql'.

26   sql,
     ~~~

server/db/schema/notifications/index.ts:2:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './notifications.js'?

2 export * from './notifications';
                ~~~~~~~~~~~~~~~~~

server/db/schema/notifications/index.ts:3:15 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

3 export * from './notification-preferences';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/notifications/index.ts:4:15 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 export * from './notification-templates';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/notifications/notifications.ts:4:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/notifications/notifications.ts:5:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

5 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/notifications/notifications.ts:6:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../shared/types.js'?

6 import type { Metadata } from '../shared/types';
                                ~~~~~~~~~~~~~~~~~

server/db/schema/notifications/notifications.ts:28:10 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

28   type: (schema) => schema.type.min(1).max(100),
            ~~~~~~

server/db/schema/notifications/notifications.ts:29:11 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

29   title: (schema) => schema.title.min(1).max(200),
             ~~~~~~

server/db/schema/notifications/notifications.ts:30:13 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

30   message: (schema) => schema.message.min(1),
               ~~~~~~

server/db/schema/notifications/notifications.ts:31:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

31   actionUrl: (schema) => schema.actionUrl.url().optional(),
                 ~~~~~~

server/db/schema/organizations/index.ts:2:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './organizations.js'?

2 export * from './organizations';
                ~~~~~~~~~~~~~~~~~

server/db/schema/organizations/index.ts:3:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './organization-members.js'?

3 export * from './organization-members';
                ~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/organizations/index.ts:4:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './organization-roles.js'?

4 export * from './organization-roles';
                ~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/organizations/index.ts:5:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './invitations.js'?

5 export * from './invitations';
                ~~~~~~~~~~~~~~~

server/db/schema/organizations/organization-members.ts:4:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

4 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/organizations/organization-members.ts:5:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './organizations.js'?

5 import { organizations } from './organizations';
                                ~~~~~~~~~~~~~~~~~

server/db/schema/organizations/organization-members.ts:6:23 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../enums.js'?

6 import { enums } from '../enums';
                        ~~~~~~~~~~

server/db/schema/organizations/organization-roles.ts:4:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './organizations.js'?

4 import { organizations } from './organizations';
                                ~~~~~~~~~~~~~~~~~

server/db/schema/organizations/organization-roles.ts:5:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../shared/types.js'?

5 import type { Metadata } from '../shared/types';
                                ~~~~~~~~~~~~~~~~~

server/db/schema/organizations/organization-roles.ts:27:28 - error TS2339: Property 'name' does not exist on type 'ZodString'.

27   name: (schema) => schema.name.min(1).max(50),
                              ~~~~

server/db/schema/organizations/organization-roles.ts:28:28 - error TS18048: 'schema.description' is possibly 'undefined'.

28   description: (schema) => schema.description.max(255).optional(),
                              ~~~~~~~~~~~~~~~~~~

server/db/schema/organizations/organization-roles.ts:28:47 - error TS2339: Property 'max' does not exist on type 'string'.

28   description: (schema) => schema.description.max(255).optional(),
                                                 ~~~

server/db/schema/organizations/organizations.ts:18:42 - error TS2307: Cannot find module '../../../../shared/utils/schema-utils.js' or its corresponding type declarations.

18 import { toCamelCase, toSnakeCase } from '../../../../shared/utils/schema-utils.js';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/proposals/index.ts:2:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './proposals.js'?

2 export * from './proposals';
                ~~~~~~~~~~~~~

server/db/schema/proposals/proposals.ts:5:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

5 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/proposals/proposals.ts:6:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

6 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/proposals/proposals.ts:7:23 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../trips/trips.js'?

7 import { trips } from '../trips/trips';
                        ~~~~~~~~~~~~~~~~

server/db/schema/proposals/proposals.ts:8:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

8 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/proposals/proposals.ts:115:11 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

115   title: (schema) => schema.title.min(1).max(255),
              ~~~~~~

server/db/schema/proposals/proposals.ts:116:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

116   description: (schema) => schema.description.optional(),
                    ~~~~~~

server/db/schema/proposals/proposals.ts:117:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

117   status: (schema) => schema.status.oneOf([...proposalStatusEnum]).default('draft'),
               ~~~~~~

server/db/schema/proposals/proposals.ts:118:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

118   clientName: (schema) => schema.clientName.min(1).max(255),
                   ~~~~~~

server/db/schema/proposals/proposals.ts:119:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

119   clientEmail: (schema) => schema.clientEmail.email(),
                    ~~~~~~

server/db/schema/proposals/proposals.ts:120:19 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

120   clientCompany: (schema) => schema.clientCompany.optional(),
                      ~~~~~~

server/db/schema/proposals/proposals.ts:121:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

121   subtotal: (schema) => schema.subtotal.min(0).optional(),
                 ~~~~~~

server/db/schema/proposals/proposals.ts:122:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

122   taxAmount: (schema) => schema.taxAmount.min(0).optional(),
                  ~~~~~~

server/db/schema/proposals/proposals.ts:123:20 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

123   discountAmount: (schema) => schema.discountAmount.min(0).optional(),
                       ~~~~~~

server/db/schema/proposals/proposals.ts:124:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

124   totalAmount: (schema) => schema.totalAmount.min(0).optional(),
                    ~~~~~~

server/db/schema/proposals/proposals.ts:125:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

125   currency: (schema) => schema.currency.length(3).optional(),
                 ~~~~~~

server/db/schema/proposals/proposals.ts:126:24 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

126   termsAndConditions: (schema) => schema.termsAndConditions.optional(),
                           ~~~~~~

server/db/schema/proposals/proposals.ts:127:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

127   metadata: (schema) => schema.metadata.optional(),
                 ~~~~~~

server/db/schema/shared/schema-utils.ts:27:41 - error TS2345: Argument of type 'BuildSchema<"insert", Record<string, PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}>>, undefined, undefined>' is not assignable to parameter of type 'ZodObject<any, UnknownKeysParam, ZodTypeAny, { [x: string]: any; }, { [x: string]: any; }>'.
  Type 'ZodObject<{}, { out: {}; in: {}; }>' is missing the following properties from type 'ZodObject<any, UnknownKeysParam, ZodTypeAny, { [x: string]: any; }, { [x: string]: any; }>': _cached, _getCached, _parse, nonstrict, and 13 more.

27   const insert = options.insertSchema?.(baseInsert) ?? baseInsert;
                                           ~~~~~~~~~~

server/db/schema/shared/schema-utils.ts:28:41 - error TS2345: Argument of type 'BuildSchema<"select", Record<string, PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}>>, undefined, undefined>' is not assignable to parameter of type 'ZodObject<any, UnknownKeysParam, ZodTypeAny, { [x: string]: any; }, { [x: string]: any; }>'.
  Type 'ZodObject<{ [x: string]: ZodNullable<ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>; }, { out: {}; in: {}; }>' is missing the following properties from type 'ZodObject<any, UnknownKeysParam, ZodTypeAny, { [x: string]: any; }, { [x: string]: any; }>': _cached, _getCached, _parse, nonstrict, and 13 more.

28   const select = options.selectSchema?.(baseSelect) ?? baseSelect;
                                           ~~~~~~~~~~

server/db/schema/superadmin/active-sessions.ts:3:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

3 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/superadmin/active-sessions.ts:4:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

4 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/superadmin/active-sessions.ts:21:13 - error TS2693: 'boolean' only refers to a type, but is being used as a value here.

21   isActive: boolean('is_active').default(true).notNull(),
               ~~~~~~~

server/db/schema/superadmin/active-sessions.ts:37:32 - error TS2339: Property 'username' does not exist on type 'ZodString'.

37   username: (schema) => schema.username.min(1).max(100),
                                  ~~~~~~~~

server/db/schema/superadmin/active-sessions.ts:38:35 - error TS2339: Property 'email' does not exist on type '(params?: string | { pattern?: RegExp | undefined; abort?: boolean | undefined; error?: string | $ZodErrorMap<$ZodIssueInvalidStringFormat> | undefined; message?: string | undefined; } | undefined) => ZodString'.

38   email: (schema) => schema.email.email(),
                                     ~~~~~

server/db/schema/superadmin/active-sessions.ts:39:28 - error TS2339: Property 'role' does not exist on type 'ZodString'.

39   role: (schema) => schema.role.min(1).max(50),
                              ~~~~

server/db/schema/superadmin/active-sessions.ts:40:40 - error TS2339: Property 'organizationName' does not exist on type 'ZodString'.

40   organizationName: (schema) => schema.organizationName.optional(),
                                          ~~~~~~~~~~~~~~~~

server/db/schema/superadmin/active-sessions.ts:41:33 - error TS2339: Property 'ipAddress' does not exist on type 'ZodString'.

41   ipAddress: (schema) => schema.ipAddress.ip().optional(),
                                   ~~~~~~~~~

server/db/schema/superadmin/active-sessions.ts:42:33 - error TS2339: Property 'userAgent' does not exist on type 'ZodString'.

42   userAgent: (schema) => schema.userAgent.max(512).optional(),
                                   ~~~~~~~~~

server/db/schema/superadmin/active-sessions.ts:43:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

43   isActive: (schema) => schema.isActive.optional(),
                ~~~~~~

server/db/schema/superadmin/active-sessions.ts:44:32 - error TS2339: Property 'metadata' does not exist on type 'ZodType<Record<string, unknown>, Record<string, unknown>, $ZodTypeInternals<Record<string, unknown>, Record<string, unknown>>>'.

44   metadata: (schema) => schema.metadata.optional(),
                                  ~~~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:3:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

3 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:4:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

4 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:5:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

5 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:63:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

63   endpoint: (schema) => schema.endpoint.min(1).max(255),
                ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:64:11 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

64   model: (schema) => schema.model.min(1).max(100),
             ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:65:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

65   provider: (schema) => schema.provider.min(1).max(100),
                ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:66:18 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

66   promptTokens: (schema) => schema.promptTokens.min(0).optional(),
                    ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:67:22 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

67   completionTokens: (schema) => schema.completionTokens.min(0).optional(),
                        ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:68:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

68   totalTokens: (schema) => schema.totalTokens.min(0).optional(),
                   ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:69:10 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

69   cost: (schema) => schema.cost.min(0).optional(),
            ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:70:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

70   rateLimit: (schema) => schema.rateLimit.min(0).optional(),
                 ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:71:24 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

71   rateLimitRemaining: (schema) => schema.rateLimitRemaining.min(0).optional(),
                          ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:72:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

72   latencyMs: (schema) => schema.latencyMs.min(0).optional(),
                 ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:73:20 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

73   responseStatus: (schema) => schema.responseStatus.optional(),
                      ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:74:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

74   ipAddress: (schema) => schema.ipAddress.ip().optional(),
                 ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:75:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

75   userAgent: (schema) => schema.userAgent.max(512).optional(),
                 ~~~~~~

server/db/schema/superadmin/ai-usage-logs.ts:76:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

76   metadata: (schema) => schema.metadata.optional(),
                ~~~~~~

server/db/schema/superadmin/audit-logs.ts:3:23 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

3 import { users } from '../users';
                        ~~~~~~~~~~

server/db/schema/superadmin/audit-logs.ts:4:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

4 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/audit-logs.ts:5:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

5 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/superadmin/audit-logs.ts:41:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

41   action: (schema) => schema.action.min(1).max(255),
              ~~~~~~

server/db/schema/superadmin/audit-logs.ts:42:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

42   entityType: (schema) => schema.entityType.min(1).max(100),
                  ~~~~~~

server/db/schema/superadmin/audit-logs.ts:43:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

43   entityId: (schema) => schema.entityId.uuid().optional(),
                ~~~~~~

server/db/schema/superadmin/audit-logs.ts:44:13 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

44   details: (schema) => schema.details.optional(),
               ~~~~~~

server/db/schema/superadmin/audit-logs.ts:45:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

45   ipAddress: (schema) => schema.ipAddress.ip().optional(),
                 ~~~~~~

server/db/schema/superadmin/audit-logs.ts:46:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

46   userAgent: (schema) => schema.userAgent.max(512).optional(),
                 ~~~~~~

server/db/schema/superadmin/audit-logs.ts:47:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

47   severity: (schema) => schema.severity.oneOf(['info', 'warning', 'error', 'critical'] as const).default('info'),
                ~~~~~~

server/db/schema/superadmin/background-jobs.ts:3:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

3 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/superadmin/background-jobs.ts:92:6 - error TS2339: Property 'unique' does not exist on type 'IndexBuilder'.

92     .unique(),
        ~~~~~~

server/db/schema/superadmin/background-jobs.ts:100:10 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

100   name: (schema) => schema.name.min(1).max(100),
             ~~~~~~

server/db/schema/superadmin/background-jobs.ts:101:11 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

101   queue: (schema) => schema.queue.min(1).max(50),
              ~~~~~~

server/db/schema/superadmin/background-jobs.ts:102:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

102   status: (schema) => schema.status.oneOf([
               ~~~~~~

server/db/schema/superadmin/background-jobs.ts:105:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

105   priority: (schema) => schema.priority.oneOf([
                 ~~~~~~

server/db/schema/superadmin/background-jobs.ts:108:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

108   progress: (schema) => schema.progress.min(0).max(100).optional(),
                 ~~~~~~

server/db/schema/superadmin/background-jobs.ts:109:21 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

109   progressMessage: (schema) => schema.progressMessage.optional(),
                        ~~~~~~

server/db/schema/superadmin/background-jobs.ts:110:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

110   retryCount: (schema) => schema.retryCount.min(0).optional(),
                   ~~~~~~

server/db/schema/superadmin/background-jobs.ts:111:16 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

111   maxRetries: (schema) => schema.maxRetries.min(0).optional(),
                   ~~~~~~

server/db/schema/superadmin/background-jobs.ts:112:13 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

112   timeout: (schema) => schema.timeout.min(0).optional(),
                ~~~~~~

server/db/schema/superadmin/background-jobs.ts:113:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

113   duration: (schema) => schema.duration.min(0).optional(),
                 ~~~~~~

server/db/schema/superadmin/background-jobs.ts:114:10 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

114   tags: (schema) => schema.tags.optional(),
             ~~~~~~

server/db/schema/superadmin/background-jobs.ts:115:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

115   metadata: (schema) => schema.metadata.optional(),
                 ~~~~~~

server/db/schema/superadmin/background-jobs.ts:120:29 - error TS2339: Property 'jobId' does not exist on type 'ZodUUID'.

120   jobId: (schema) => schema.jobId.uuid(),
                                ~~~~~

server/db/schema/superadmin/background-jobs.ts:121:38 - error TS2339: Property 'dependsOnJobId' does not exist on type 'ZodUUID'.

121   dependsOnJobId: (schema) => schema.dependsOnJobId.uuid(),
                                         ~~~~~~~~~~~~~~

server/db/schema/superadmin/billing-events.ts:3:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

3 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/billing-events.ts:4:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

4 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/superadmin/billing-events.ts:74:6 - error TS2339: Property 'unique' does not exist on type 'IndexBuilder'.

74     .unique(),
        ~~~~~~

server/db/schema/superadmin/billing-events.ts:98:13 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

98   eventId: (schema) => schema.eventId.min(1).max(255),
               ~~~~~~

server/db/schema/superadmin/billing-events.ts:99:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

99   eventType: (schema) => schema.eventType.oneOf([
                 ~~~~~~

server/db/schema/superadmin/billing-events.ts:106:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

106   status: (schema) => schema.status.oneOf([
               ~~~~~~

server/db/schema/superadmin/billing-events.ts:109:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

109   amount: (schema) => schema.amount.min(0).optional(),
               ~~~~~~

server/db/schema/superadmin/billing-events.ts:110:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

110   currency: (schema) => schema.currency.length(3).optional(),
                 ~~~~~~

server/db/schema/superadmin/billing-events.ts:111:24 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

111   processingAttempts: (schema) => schema.processingAttempts.min(0).optional(),
                           ~~~~~~

server/db/schema/superadmin/billing-events.ts:112:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

112   rawEvent: (schema) => schema.rawEvent.optional(),
                 ~~~~~~

server/db/schema/superadmin/billing-events.ts:113:11 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

113   error: (schema) => schema.error.optional(),
              ~~~~~~

server/db/schema/superadmin/billing-events.ts:114:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

114   metadata: (schema) => schema.metadata.optional(),
                 ~~~~~~

server/db/schema/superadmin/feature-flags.ts:3:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../organizations/organizations.js'?

3 import { organizations } from '../organizations/organizations';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/feature-flags.ts:4:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

4 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/superadmin/feature-flags.ts:28:6 - error TS2339: Property 'using' does not exist on type 'IndexBuilder'.

28     .using('btree')
        ~~~~~

server/db/schema/superadmin/feature-flags.ts:51:6 - error TS2339: Property 'unique' does not exist on type 'IndexBuilder'.

51     .unique(),
        ~~~~~~

server/db/schema/superadmin/feature-flags.ts:60:10 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

60   name: (schema) => schema.name.min(1).max(100).regex(/^[a-z0-9_]+$/),
            ~~~~~~

server/db/schema/superadmin/feature-flags.ts:61:17 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

61   description: (schema) => schema.description.optional(),
                   ~~~~~~

server/db/schema/superadmin/feature-flags.ts:62:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

62   isEnabled: (schema) => schema.isEnabled.optional(),
                 ~~~~~~

server/db/schema/superadmin/feature-flags.ts:63:31 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

63   allowOrganizationOverride: (schema) => schema.allowOrganizationOverride.optional(),
                                 ~~~~~~

server/db/schema/superadmin/feature-flags.ts:64:18 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

64   defaultValue: (schema) => schema.defaultValue.optional(),
                    ~~~~~~

server/db/schema/superadmin/feature-flags.ts:65:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

65   metadata: (schema) => schema.metadata.optional(),
                ~~~~~~

server/db/schema/superadmin/feature-flags.ts:66:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

66   updatedBy: (schema) => schema.updatedBy.email().optional(),
                 ~~~~~~

server/db/schema/superadmin/feature-flags.ts:71:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

71   isEnabled: (schema) => schema.isEnabled.required(),
                 ~~~~~~

server/db/schema/superadmin/feature-flags.ts:72:14 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

72   metadata: (schema) => schema.metadata.optional(),
                ~~~~~~

server/db/schema/superadmin/feature-flags.ts:73:15 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

73   updatedBy: (schema) => schema.updatedBy.email().optional(),
                 ~~~~~~

server/db/schema/superadmin/index.ts:2:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './audit-logs.js'?

2 export * from './audit-logs';
                ~~~~~~~~~~~~~~

server/db/schema/superadmin/index.ts:3:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './active-sessions.js'?

3 export * from './active-sessions';
                ~~~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/index.ts:4:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './ai-usage-logs.js'?

4 export * from './ai-usage-logs';
                ~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/index.ts:5:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './feature-flags.js'?

5 export * from './feature-flags';
                ~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/index.ts:6:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './background-jobs.js'?

6 export * from './background-jobs';
                ~~~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/index.ts:7:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './billing-events.js'?

7 export * from './billing-events';
                ~~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/index.ts:8:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './system-activity.js'?

8 export * from './system-activity';
                ~~~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:3:33 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../base.js'?

3 import { withBaseColumns } from '../base';
                                  ~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:11:11 - error TS2304: Cannot find name 'text'.

11   period: text('period').notNull(), // 'hourly', 'daily', 'weekly', 'monthly'
             ~~~~

server/db/schema/superadmin/system-activity.ts:62:6 - error TS2339: Property 'unique' does not exist on type 'IndexBuilder'.

62     .unique(),
        ~~~~~~

server/db/schema/superadmin/system-activity.ts:68:28 - error TS2339: Property 'date' does not exist on type 'ZodDate'.

68   date: (schema) => schema.date.optional(),
                              ~~~~

server/db/schema/superadmin/system-activity.ts:69:12 - error TS7006: Parameter 'schema' implicitly has an 'any' type.

69   period: (schema) => schema.period.oneOf(['hourly', 'daily', 'weekly', 'monthly'] as const),
              ~~~~~~

server/db/schema/superadmin/system-activity.ts:70:34 - error TS2339: Property 'totalUsers' does not exist on type 'ZodInt'.

70   totalUsers: (schema) => schema.totalUsers.min(0).optional(),
                                    ~~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:71:35 - error TS2339: Property 'activeUsers' does not exist on type 'ZodInt'.

71   activeUsers: (schema) => schema.activeUsers.min(0).optional(),
                                     ~~~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:72:32 - error TS2339: Property 'newUsers' does not exist on type 'ZodInt'.

72   newUsers: (schema) => schema.newUsers.min(0).optional(),
                                  ~~~~~~~~

server/db/schema/superadmin/system-activity.ts:73:38 - error TS2339: Property 'returningUsers' does not exist on type 'ZodInt'.

73   returningUsers: (schema) => schema.returningUsers.min(0).optional(),
                                        ~~~~~~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:74:42 - error TS2339: Property 'totalOrganizations' does not exist on type 'ZodInt'.

74   totalOrganizations: (schema) => schema.totalOrganizations.min(0).optional(),
                                            ~~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:75:43 - error TS2339: Property 'activeOrganizations' does not exist on type 'ZodInt'.

75   activeOrganizations: (schema) => schema.activeOrganizations.min(0).optional(),
                                             ~~~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:76:40 - error TS2339: Property 'newOrganizations' does not exist on type 'ZodInt'.

76   newOrganizations: (schema) => schema.newOrganizations.min(0).optional(),
                                          ~~~~~~~~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:77:37 - error TS2339: Property 'totalSessions' does not exist on type 'ZodInt'.

77   totalSessions: (schema) => schema.totalSessions.min(0).optional(),
                                       ~~~~~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:78:42 - error TS2339: Property 'avgSessionDuration' does not exist on type 'ZodInt'.

78   avgSessionDuration: (schema) => schema.avgSessionDuration.min(0).optional(),
                                            ~~~~~~~~~~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:79:32 - error TS2339: Property 'apiCalls' does not exist on type 'ZodInt'.

79   apiCalls: (schema) => schema.apiCalls.min(0).optional(),
                                  ~~~~~~~~

server/db/schema/superadmin/system-activity.ts:80:33 - error TS2339: Property 'apiErrors' does not exist on type 'ZodInt'.

80   apiErrors: (schema) => schema.apiErrors.min(0).optional(),
                                   ~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:81:31 - error TS2339: Property 'aiCalls' does not exist on type 'ZodInt'.

81   aiCalls: (schema) => schema.aiCalls.min(0).optional(),
                                 ~~~~~~~

server/db/schema/superadmin/system-activity.ts:82:36 - error TS2339: Property 'aiTokensUsed' does not exist on type 'ZodInt'.

82   aiTokensUsed: (schema) => schema.aiTokensUsed.min(0).optional(),
                                      ~~~~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:83:30 - error TS2339: Property 'aiCost' does not exist on type 'ZodInt'.

83   aiCost: (schema) => schema.aiCost.min(0).optional(),
                                ~~~~~~

server/db/schema/superadmin/system-activity.ts:84:31 - error TS2339: Property 'revenue' does not exist on type 'ZodInt'.

84   revenue: (schema) => schema.revenue.min(0).optional(),
                                 ~~~~~~~

server/db/schema/superadmin/system-activity.ts:85:27 - error TS2339: Property 'mrr' does not exist on type 'ZodInt'.

85   mrr: (schema) => schema.mrr.min(0).optional(),
                             ~~~

server/db/schema/superadmin/system-activity.ts:86:27 - error TS2339: Property 'arr' does not exist on type 'ZodInt'.

86   arr: (schema) => schema.arr.min(0).optional(),
                             ~~~

server/db/schema/superadmin/system-activity.ts:87:33 - error TS2339: Property 'churnRate' does not exist on type 'ZodInt'.

87   churnRate: (schema) => schema.churnRate.min(0).max(10000).optional(),
                                   ~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:88:30 - error TS2339: Property 'uptime' does not exist on type 'ZodInt'.

88   uptime: (schema) => schema.uptime.min(0).max(10000).optional(),
                                ~~~~~~

server/db/schema/superadmin/system-activity.ts:89:33 - error TS2339: Property 'errorRate' does not exist on type 'ZodInt'.

89   errorRate: (schema) => schema.errorRate.min(0).max(10000).optional(),
                                   ~~~~~~~~~

server/db/schema/superadmin/system-activity.ts:90:32 - error TS2339: Property 'metadata' does not exist on type 'ZodType<Record<string, unknown>, Record<string, unknown>, $ZodTypeInternals<Record<string, unknown>, Record<string, unknown>>>'.

90   metadata: (schema) => schema.metadata.optional(),
                                  ~~~~~~~~

server/db/schema/trips/index.ts:2:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './trips.js'?

2 export * from './trips';
                ~~~~~~~~~

server/db/schema/trips/index.ts:3:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './trip-collaborators.js'?

3 export * from './trip-collaborators';
                ~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/trips/index.ts:4:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './trip-activities.js'?

4 export * from './trip-activities';
                ~~~~~~~~~~~~~~~~~~~

server/db/schema/trips/index.ts:5:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './trip-comments.js'?

5 export * from './trip-comments';
                ~~~~~~~~~~~~~~~~~

server/db/schema/trips/index.ts:6:15 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

6 export * from './trip-expenses';
                ~~~~~~~~~~~~~~~~~

server/db/schema/trips/trip-activities.ts:16:42 - error TS2307: Cannot find module '../../../../shared/utils/schema-utils.js' or its corresponding type declarations.

16 import { toCamelCase, toSnakeCase } from '../../../../shared/utils/schema-utils.js';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/trips/trip-collaborators.ts:17:42 - error TS2307: Cannot find module '../../../../shared/utils/schema-utils.js' or its corresponding type declarations.

17 import { toCamelCase, toSnakeCase } from '../../../../shared/utils/schema-utils.js';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/trips/trip-comments.ts:14:42 - error TS2307: Cannot find module '../../../../shared/utils/schema-utils.js' or its corresponding type declarations.

14 import { toCamelCase, toSnakeCase } from '../../../../shared/utils/schema-utils.js';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/trips/trips.ts:18:42 - error TS6059: File '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/shared/utils/case-utils.ts' is not under 'rootDir' '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server'. 'rootDir' is expected to contain all source files.
  File is ECMAScript module because '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/shared/package.json' has field "type" with value "module"

18 import { toCamelCase, toSnakeCase } from '../../../../shared/utils/case-utils.js';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/trips/trips.ts:18:42 - error TS6307: File '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/shared/utils/case-utils.ts' is not listed within the file list of project '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/tsconfig.json'. Projects must list all files or use an 'include' pattern.
  File is ECMAScript module because '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/shared/package.json' has field "type" with value "module"

18 import { toCamelCase, toSnakeCase } from '../../../../shared/utils/case-utils.js';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/db/schema/users/index.ts:2:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './users.js'?

2 export * from './users';
                ~~~~~~~~~

server/db/schema/users/index.ts:3:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './user-settings.js'?

3 export * from './user-settings';
                ~~~~~~~~~~~~~~~~~

server/db/schema/users/index.ts:4:15 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './user-sessions.js'?

4 export * from './user-sessions';
                ~~~~~~~~~~~~~~~~~

server/db/schema/users/user-sessions.ts:4:23 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './users.js'?

4 import { users } from './users';
                        ~~~~~~~~~

server/db/schema/users/user-sessions.ts:5:31 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../shared/types.js'?

5 import type { Metadata } from '../shared/types';
                                ~~~~~~~~~~~~~~~~~

server/db/schema/users/user-sessions.ts:23:36 - error TS2339: Property 'refreshToken' does not exist on type 'ZodString'.

23   refreshToken: (schema) => schema.refreshToken.min(1),
                                      ~~~~~~~~~~~~

server/db/schema/users/user-sessions.ts:24:33 - error TS2339: Property 'expiresAt' does not exist on type 'ZodDate'.

24   expiresAt: (schema) => schema.expiresAt.min(new Date()),
                                   ~~~~~~~~~

server/db/schema/users/user-settings.ts:4:23 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './users.js'?

4 import { users } from './users';
                        ~~~~~~~~~

server/db/schema/users/user-settings.ts:5:48 - error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean '../shared/types.js'?

5 import type { UserPreferences, Metadata } from '../shared/types';
                                                 ~~~~~~~~~~~~~~~~~

server/db/schema/users/users.ts:15:42 - error TS2307: Cannot find module '../../../../shared/utils/schema-utils.js' or its corresponding type declarations.

15 import { toCamelCase, toSnakeCase } from '../../../../shared/utils/schema-utils.js';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/express-augmentations.ts:8:7 - error TS2717: Subsequent property declarations must have the same type.  Property 'user' must be of type 'User | undefined', but here has type '{ [key: string]: any; id: string; email: string; organizationId: string; role: string; } | undefined'.

8       user?: {
        ~~~~

  server/src/express-augmentations.d.ts:21:7
    21       user?: User;
             ~~~~
    'user' was also declared here.

server/middleware/inputValidation.ts:90:28 - error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'string'.

90     const num = parseFloat(input);
                              ~~~~~

server/middleware/inputValidation.ts:94:26 - error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'string'.

94     const num = parseInt(input, 10);
                            ~~~~~

server/middleware/inputValidation.ts:200:17 - error TS2322: Type 'unknown' is not assignable to type 'Record<string, unknown>'.

200                 req.body = sanitizeObject(req.body);
                    ~~~~~~~~

server/middleware/inputValidation.ts:276:13 - error TS2322: Type 'Record<string, unknown>' is not assignable to type '{ [key: string]: string | string[] | undefined; }'.
  'string' index signatures are incompatible.
    Type 'unknown' is not assignable to type 'string | string[] | undefined'.

276             req.query = sanitizedQuery;
                ~~~~~~~~~

server/middleware/inputValidation.ts:369:17 - error TS2322: Type 'unknown' is not assignable to type 'Record<string, unknown>'.

369                 req.body = sanitizeObject(req.body); // Sanitize first
                    ~~~~~~~~

server/middleware/inputValidation.ts:399:17 - error TS2322: Type 'Record<string, unknown>' is not assignable to type '{ [key: string]: string | string[] | undefined; }'.
  'string' index signatures are incompatible.
    Type 'unknown' is not assignable to type 'string | string[] | undefined'.

399                 req.query = sanitizedQuery; // Apply sanitized query for Zod parsing
                    ~~~~~~~~~

server/middleware/inputValidation.ts:426:17 - error TS2322: Type 'Record<string, unknown>' is not assignable to type '{ [key: string]: string; }'.
  'string' index signatures are incompatible.
    Type 'unknown' is not assignable to type 'string'.

426                 req.params = sanitizedParams; // Apply sanitized params for Zod parsing
                    ~~~~~~~~~~

server/middleware/secureAuth.ts:17:29 - error TS6307: File '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/utils/secureJwt.ts' is not listed within the file list of project '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/tsconfig.json'. Projects must list all files or use an 'include' pattern.
  File is ECMAScript module because '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/package.json' has field "type" with value "module"

17 import { verifyToken } from '../utils/secureJwt.js';
                               ~~~~~~~~~~~~~~~~~~~~~~~

server/middleware/secureAuth.ts:58:5 - error TS2739: Type '{ id: any; userId: any; email: any; role: any; organizationId: any; displayName: any; jti: any; iat: any; exp: any; permissions: never[]; }' is missing the following properties from type 'User': hasRole, hasPermission

58     return {
       ~~~~~~

server/middleware/secureAuth.ts:98:9 - error TS2739: Type 'User' is missing the following properties from type '{ id: string; email: string; role: string; organizationId?: string | null | undefined; }': id, email

98         req.user = toUser(result.payload as TokenPayload);
           ~~~~~~~~

server/middleware/secureAuth.ts:137:9 - error TS2739: Type 'User' is missing the following properties from type '{ id: string; email: string; role: string; organizationId?: string | null | undefined; }': id, email

137         req.user = toUser(result.payload as TokenPayload);
            ~~~~~~~~

server/src/auth/auth.container.ts:23:48 - error TS1361: 'RefreshTokenRepositoryImpl' cannot be used as a value because it was imported using 'import type'.

23             this._refreshTokenRepository = new RefreshTokenRepositoryImpl();
                                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~

  server/src/auth/auth.container.ts:3:15
    3 import type { RefreshTokenRepositoryImpl } from './repositories/refresh-token.repository.js';
                    ~~~~~~~~~~~~~~~~~~~~~~~~~~
    'RefreshTokenRepositoryImpl' was imported here.

server/src/auth/auth.container.ts:29:36 - error TS2554: Expected 1 arguments, but got 0.

29             this._userRepository = new UserRepositoryImpl();
                                      ~~~~~~~~~~~~~~~~~~~~~~~~

  server/src/auth/repositories/user.repository.ts:17:5
    17     @Inject('UserRepository')
           ~~~~~~~~~~~~~~~~~~~~~~~~~
    18     private readonly userRepository: CommonUserRepository & BaseRepository<User, string, any, any>
       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    An argument for 'userRepository' was not provided.

server/src/auth/auth.container.ts:29:40 - error TS1361: 'UserRepositoryImpl' cannot be used as a value because it was imported using 'import type'.

29             this._userRepository = new UserRepositoryImpl();
                                          ~~~~~~~~~~~~~~~~~~

  server/src/auth/auth.container.ts:4:15
    4 import type { UserRepositoryImpl } from './repositories/user.repository.js';
                    ~~~~~~~~~~~~~~~~~~
    'UserRepositoryImpl' was imported here.

server/src/auth/auth.container.ts:35:37 - error TS1361: 'AuthService' cannot be used as a value because it was imported using 'import type'.

35             this._authService = new AuthService(this.refreshTokenRepository, this.userRepository);
                                       ~~~~~~~~~~~

  server/src/auth/auth.container.ts:2:15
    2 import type { AuthService } from './services/auth.service.js';
                    ~~~~~~~~~~~
    'AuthService' was imported here.

server/src/auth/auth.container.ts:35:78 - error TS2345: Argument of type 'UserRepositoryImpl' is not assignable to parameter of type 'UserRepository'.
  Type 'UserRepositoryImpl' is missing the following properties from type 'UserRepository': findByEmailAndOrganization, verifyPassword, updateSettings, getProfile, and 2 more.

35             this._authService = new AuthService(this.refreshTokenRepository, this.userRepository);
                                                                                ~~~~~~~~~~~~~~~~~~~

server/src/auth/auth.container.ts:41:40 - error TS1361: 'AuthController' cannot be used as a value because it was imported using 'import type'.

41             this._authController = new AuthController(this.authService);
                                          ~~~~~~~~~~~~~~

  server/src/auth/auth.container.ts:1:15
    1 import type { AuthController } from './controllers/auth.controller.js';
                    ~~~~~~~~~~~~~~
    'AuthController' was imported here.

server/src/auth/auth.module.ts:4:37 - error TS2307: Cannot find module './services/jwtAuthService.js' or its corresponding type declarations.

4 import type { JwtAuthService } from './services/jwtAuthService.js';
                                      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/auth.module.ts:12:2 - error TS1361: 'Module' cannot be used as a value because it was imported using 'import type'.

12 @Module({
    ~~~~~~

  server/src/auth/auth.module.ts:1:15
    1 import type { Module } from '@nestjs/common';
                    ~~~~~~
    'Module' was imported here.

server/src/auth/auth.module.ts:14:9 - error TS1361: 'ConfigModule' cannot be used as a value because it was imported using 'import type'.

14         ConfigModule,
           ~~~~~~~~~~~~

  server/src/auth/auth.module.ts:2:15
    2 import type { ConfigModule } from '@nestjs/config';
                    ~~~~~~~~~~~~
    'ConfigModule' was imported here.

server/src/auth/auth.module.ts:15:9 - error TS1361: 'RepositoriesModule' cannot be used as a value because it was imported using 'import type'.

15         RepositoriesModule,
           ~~~~~~~~~~~~~~~~~~

  server/src/auth/auth.module.ts:5:15
    5 import type { RepositoriesModule } from '../common/repositories/repositories.module.js';
                    ~~~~~~~~~~~~~~~~~~
    'RepositoriesModule' was imported here.

server/src/auth/auth.module.ts:16:9 - error TS1361: 'EmailModule' cannot be used as a value because it was imported using 'import type'.

16         EmailModule,
           ~~~~~~~~~~~

  server/src/auth/auth.module.ts:7:15
    7 import type { EmailModule } from '../email/email.module.js';
                    ~~~~~~~~~~~
    'EmailModule' was imported here.

server/src/auth/auth.module.ts:18:19 - error TS1361: 'AuthController' cannot be used as a value because it was imported using 'import type'.

18     controllers: [AuthController],
                     ~~~~~~~~~~~~~~

  server/src/auth/auth.module.ts:3:15
    3 import type { AuthController } from './controllers/auth.controller.js';
                    ~~~~~~~~~~~~~~
    'AuthController' was imported here.

server/src/auth/auth.module.ts:20:9 - error TS1361: 'JwtAuthService' cannot be used as a value because it was imported using 'import type'.

20         JwtAuthService,
           ~~~~~~~~~~~~~~

  server/src/auth/auth.module.ts:4:15
    4 import type { JwtAuthService } from './services/jwtAuthService.js';
                    ~~~~~~~~~~~~~~
    'JwtAuthService' was imported here.

server/src/auth/auth.module.ts:21:9 - error TS1361: 'AuthUserRepositoryProvider' cannot be used as a value because it was imported using 'import type'.

21         AuthUserRepositoryProvider,
           ~~~~~~~~~~~~~~~~~~~~~~~~~~

  server/src/auth/auth.module.ts:6:15
    6 import type { AuthUserRepositoryProvider, RefreshTokenRepositoryProvider } from '../common/repositories/repository.providers.js';
                    ~~~~~~~~~~~~~~~~~~~~~~~~~~
    'AuthUserRepositoryProvider' was imported here.

server/src/auth/auth.module.ts:22:9 - error TS1361: 'RefreshTokenRepositoryProvider' cannot be used as a value because it was imported using 'import type'.

22         RefreshTokenRepositoryProvider,
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  server/src/auth/auth.module.ts:6:43
    6 import type { AuthUserRepositoryProvider, RefreshTokenRepositoryProvider } from '../common/repositories/repository.providers.js';
                                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    'RefreshTokenRepositoryProvider' was imported here.

server/src/auth/auth.module.ts:24:15 - error TS1361: 'JwtAuthService' cannot be used as a value because it was imported using 'import type'.

24     exports: [JwtAuthService],
                 ~~~~~~~~~~~~~~

  server/src/auth/auth.module.ts:4:15
    4 import type { JwtAuthService } from './services/jwtAuthService.js';
                    ~~~~~~~~~~~~~~
    'JwtAuthService' was imported here.

server/src/auth/auth.routes.ts:1:69 - error TS2614: Module '"../../express-augmentations.ts"' has no exported member 'RequestHandler'. Did you mean to use 'import RequestHandler from "../../express-augmentations.ts"' instead?

1 import { Router, Response, NextFunction, Request as ExpressRequest, RequestHandler } from '../../express-augmentations.ts';
                                                                      ~~~~~~~~~~~~~~

server/src/auth/auth.routes.ts:1:91 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

1 import { Router, Response, NextFunction, Request as ExpressRequest, RequestHandler } from '../../express-augmentations.ts';
                                                                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/auth.routes.ts:1:91 - error TS6307: File '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/express-augmentations.ts' is not listed within the file list of project '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/tsconfig.json'. Projects must list all files or use an 'include' pattern.
  File is ECMAScript module because '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/package.json' has field "type" with value "module"

1 import { Router, Response, NextFunction, Request as ExpressRequest, RequestHandler } from '../../express-augmentations.ts';
                                                                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/auth.routes.ts:6:32 - error TS2307: Cannot find module './services/jwtAuthService.js' or its corresponding type declarations.

6 import { JwtAuthService } from './services/jwtAuthService.js';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/auth.routes.ts:11:44 - error TS6307: File '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/middleware/inputValidation.ts' is not listed within the file list of project '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/tsconfig.json'. Projects must list all files or use an 'include' pattern.
  File is ECMAScript module because '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/package.json' has field "type" with value "module"

11 import { validateAndSanitizeRequest } from '../../middleware/inputValidation.js';
                                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/auth.routes.ts:12:30 - error TS6307: File '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/middleware/secureAuth.ts' is not listed within the file list of project '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/tsconfig.json'. Projects must list all files or use an 'include' pattern.
  File is ECMAScript module because '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/package.json' has field "type" with value "module"

12 import { authenticate } from '../../middleware/secureAuth.js';
                                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/auth.routes.ts:19:8 - error TS2307: Cannot find module '@shared/src/types/auth/dto' or its corresponding type declarations.

19 } from '@shared/src/types/auth/dto';
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/auth.routes.ts:44:6 - error TS2300: Duplicate identifier 'ControllerMethod'.

44 type ControllerMethod = Array<RequestHandler>;
        ~~~~~~~~~~~~~~~~

server/src/auth/auth.routes.ts:46:16 - error TS1362: 'Router' cannot be used as a value because it was exported using 'export type'.

46 const router = Router();
                  ~~~~~~

  server/express-augmentations.ts:29:29
    29 export type { NextFunction, Router, Application };
                                   ~~~~~~
    'Router' was exported here.

server/src/auth/auth.routes.ts:49:24 - error TS2554: Expected 1 arguments, but got 0.

49 const userRepository = new UserRepositoryImpl();
                          ~~~~~~~~~~~~~~~~~~~~~~~~

  server/src/auth/repositories/user.repository.ts:17:5
    17     @Inject('UserRepository')
           ~~~~~~~~~~~~~~~~~~~~~~~~~
    18     private readonly userRepository: CommonUserRepository & BaseRepository<User, string, any, any>
       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    An argument for 'userRepository' was not provided.

server/src/auth/auth.routes.ts:67:6 - error TS2300: Duplicate identifier 'ControllerMethod'.

67 type ControllerMethod = ((req: ExpressRequest, res: Response, next: NextFunction) => void | Promise<void>) | Array<(req: ExpressRequest, res: Response, next: NextFunction) => void | Promise<void>>;
        ~~~~~~~~~~~~~~~~

server/src/auth/auth.routes.ts:76:29 - error TS7006: Parameter 'req' implicitly has an 'any' type.

76         routeHandlers.push((req, res, next) => {
                               ~~~

server/src/auth/auth.routes.ts:76:34 - error TS7006: Parameter 'res' implicitly has an 'any' type.

76         routeHandlers.push((req, res, next) => {
                                    ~~~

server/src/auth/auth.routes.ts:76:39 - error TS7006: Parameter 'next' implicitly has an 'any' type.

76         routeHandlers.push((req, res, next) => {
                                         ~~~~

server/src/auth/auth.routes.ts:78:65 - error TS2345: Argument of type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>' is not assignable to parameter of type 'CustomRequest'.
  Types of property 'query' are incompatible.
    Type 'ParsedQs' is not assignable to type '{ [key: string]: string | string[] | undefined; }'.
      'string' index signatures are incompatible.
        Type 'string | ParsedQs | (string | ParsedQs)[] | undefined' is not assignable to type 'string | string[] | undefined'.
          Type 'ParsedQs' is not assignable to type 'string | string[] | undefined'.
            Type 'ParsedQs' is missing the following properties from type 'string[]': length, pop, push, concat, and 29 more.

78             return validateAndSanitizeRequest(validationSchema)(processedReq, res, next);
                                                                   ~~~~~~~~~~~~

server/src/auth/auth.routes.ts:91:58 - error TS2339: Property 'register' does not exist on type 'AuthController'.

91 createValidatedRoute('/register', 'post', authController.register, {
                                                            ~~~~~~~~

server/src/auth/auth.routes.ts:120:65 - error TS2339: Property 'changePassword' does not exist on type 'AuthController'.

120 createValidatedRoute('/change-password', 'post', authController.changePassword, {
                                                                    ~~~~~~~~~~~~~~

server/src/auth/auth.service.ts:10:42 - error TS2307: Cannot find module '@shared/src/types/auth/auth.js' or its corresponding type declarations.

10 import { AuthError, AuthErrorCode } from '@shared/src/types/auth/auth.js';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/auth.service.ts:11:17 - error TS2305: Module '"../../db/schema.js"' has no exported member 'refreshTokens'.

11 import { users, refreshTokens, auditLogsTableDefinition as auditLogs } from '../../db/schema.js';
                   ~~~~~~~~~~~~~

server/src/auth/auth.service.ts:11:32 - error TS2305: Module '"../../db/schema.js"' has no exported member 'auditLogsTableDefinition'.

11 import { users, refreshTokens, auditLogsTableDefinition as auditLogs } from '../../db/schema.js';
                                  ~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/auth.service.ts:18:26 - error TS2307: Cannot find module '@shared/src/types/auth/permissions.js' or its corresponding type declarations.

18 import { UserRole } from '@shared/src/types/auth/permissions.js';
                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/auth.service.ts:28:8 - error TS2307: Cannot find module '@shared/types' or its corresponding type declarations.

28 } from '@shared/types';
          ~~~~~~~~~~~~~~~

server/src/auth/auth.service.ts:125:46 - error TS2339: Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?"> | { [x: string]: RelationalQueryBuilder<ExtractTablesWithRelations<any>, { ...; }>; }'.
  Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?">'.

125             const user = await this.db.query.users.findFirst({
                                                 ~~~~~

server/src/auth/auth.service.ts:217:54 - error TS2339: Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?"> | { [x: string]: RelationalQueryBuilder<ExtractTablesWithRelations<any>, { ...; }>; }'.
  Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?">'.

217             const existingUser = await this.db.query.users.findFirst({
                                                         ~~~~~

server/src/auth/auth.service.ts:238:59 - error TS2769: No overload matches this call.
  Overload 1 of 2, '(value: { email: string | SQL<unknown> | Placeholder<string, any>; firstName: string | SQL<unknown> | Placeholder<string, any>; lastName: string | SQL<unknown> | Placeholder<...>; ... 7 more ...; updatedAt?: Date | ... 2 more ... | undefined; }): PgInsertBase<...>', gave the following error.
    Object literal may only specify known properties, and 'username' does not exist in type '{ email: string | SQL<unknown> | Placeholder<string, any>; firstName: string | SQL<unknown> | Placeholder<string, any>; lastName: string | SQL<unknown> | Placeholder<...>; ... 7 more ...; updatedAt?: Date | ... 2 more ... | undefined; }'.
  Overload 2 of 2, '(values: { email: string | SQL<unknown> | Placeholder<string, any>; firstName: string | SQL<unknown> | Placeholder<string, any>; lastName: string | SQL<unknown> | Placeholder<...>; ... 7 more ...; updatedAt?: Date | ... 2 more ... | undefined; }[]): PgInsertBase<...>', gave the following error.
    Object literal may only specify known properties, and 'email' does not exist in type '{ email: string | SQL<unknown> | Placeholder<string, any>; firstName: string | SQL<unknown> | Placeholder<string, any>; lastName: string | SQL<unknown> | Placeholder<...>; ... 7 more ...; updatedAt?: Date | ... 2 more ... | undefined; }[]'.

238             const [newUser] = await this.db.insert(users).values({
                                                              ~~~~~~


server/src/auth/auth.service.ts:256:41 - error TS2339: Property 'organizationId' does not exist on type '{ id: string; email: string; role: "user" | "admin" | "super_admin"; firstName: string; lastName: string; password: string; emailVerified: boolean; lastLoginAt: Date | null; metadata: Metadata | null; createdAt: Date; updatedAt: Date; }'.

256                 organizationId: newUser.organizationId || null, // Ensure null instead of undefined
                                            ~~~~~~~~~~~~~~

server/src/auth/auth.service.ts:257:39 - error TS2339: Property 'tokenVersion' does not exist on type '{ id: string; email: string; role: "user" | "admin" | "super_admin"; firstName: string; lastName: string; password: string; emailVerified: boolean; lastLoginAt: Date | null; metadata: Metadata | null; createdAt: Date; updatedAt: Date; }'.

257                 tokenVersion: newUser.tokenVersion
                                          ~~~~~~~~~~~~

server/src/auth/auth.service.ts:266:42 - error TS2339: Property 'organizationId' does not exist on type '{ id: string; email: string; role: "user" | "admin" | "super_admin"; firstName: string; lastName: string; password: string; emailVerified: boolean; lastLoginAt: Date | null; metadata: Metadata | null; createdAt: Date; updatedAt: Date; }'.

266                 organization_id: newUser.organizationId || null,
                                             ~~~~~~~~~~~~~~

server/src/auth/auth.service.ts:270:36 - error TS2339: Property 'isActive' does not exist on type '{ id: string; email: string; role: "user" | "admin" | "super_admin"; firstName: string; lastName: string; password: string; emailVerified: boolean; lastLoginAt: Date | null; metadata: Metadata | null; createdAt: Date; updatedAt: Date; }'.

270                 is_active: newUser.isActive,
                                       ~~~~~~~~

server/src/auth/auth.service.ts:291:46 - error TS2339: Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?"> | { [x: string]: RelationalQueryBuilder<ExtractTablesWithRelations<any>, { ...; }>; }'.
  Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?">'.

291             const user = await this.db.query.users.findFirst({
                                                 ~~~~~

server/src/auth/auth.service.ts:317:21 - error TS2561: Object literal may only specify known properties, but 'lastLoginIp' does not exist in type '{ email?: string | SQL<unknown> | PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}> | undefined; firstName?: string | SQL<...> | PgColumn<...> | undefined; ... 8 more ...; updatedAt?: Date | ... 2 more ... | undefined; }'. Did you mean to write 'lastLoginAt'?

317                     lastLoginIp: ip,
                        ~~~~~~~~~~~

server/src/auth/auth.service.ts:410:43 - error TS2551: Property 'setex' does not exist on type 'RedisWithFallback'. Did you mean 'set'?

410                         await redisClient.setex(
                                              ~~~~~

  server/utils/redis.ts:73:9
    73   async set(key: string, value: any, ttlMs?: number) {
               ~~~
    'set' is declared here.

server/src/auth/auth.service.ts:424:39 - error TS2551: Property 'setex' does not exist on type 'RedisWithFallback'. Did you mean 'set'?

424                     await redisClient.setex(
                                          ~~~~~

  server/utils/redis.ts:73:9
    73   async set(key: string, value: any, ttlMs?: number) {
               ~~~
    'set' is declared here.

server/src/auth/auth.service.ts:457:51 - error TS2551: Property 'setex' does not exist on type 'RedisWithFallback'. Did you mean 'set'?

457                                 await redisClient.setex(
                                                      ~~~~~

  server/utils/redis.ts:73:9
    73   async set(key: string, value: any, ttlMs?: number) {
               ~~~
    'set' is declared here.

server/src/auth/auth.service.ts:549:46 - error TS2339: Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?"> | { [x: string]: RelationalQueryBuilder<ExtractTablesWithRelations<any>, { ...; }>; }'.
  Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?">'.

549             const user = await this.db.query.users.findFirst({
                                                 ~~~~~

server/src/auth/auth.service.ts:618:35 - error TS2551: Property 'setex' does not exist on type 'RedisWithFallback'. Did you mean 'set'?

618                 await redisClient.setex(
                                      ~~~~~

  server/utils/redis.ts:73:9
    73   async set(key: string, value: any, ttlMs?: number) {
               ~~~
    'set' is declared here.

server/src/auth/auth.service.ts:629:25 - error TS2561: Object literal may only specify known properties, but 'lastLoginIp' does not exist in type '{ email?: string | SQL<unknown> | PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}> | undefined; firstName?: string | SQL<...> | PgColumn<...> | undefined; ... 8 more ...; updatedAt?: Date | ... 2 more ... | undefined; }'. Did you mean to write 'lastLoginAt'?

629                         lastLoginIp: ip,
                            ~~~~~~~~~~~

server/src/auth/auth.service.ts:664:65 - error TS18046: 'error' is of type 'unknown'.

664                 logger.warn(`Auth error during token refresh: ${error.message}`, {
                                                                    ~~~~~

server/src/auth/auth.service.ts:666:27 - error TS18046: 'error' is of type 'unknown'.

666                     code: error.code
                              ~~~~~

server/src/auth/auth.service.ts:721:46 - error TS2339: Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?"> | { [x: string]: RelationalQueryBuilder<ExtractTablesWithRelations<any>, { ...; }>; }'.
  Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?">'.

721             const user = await this.db.query.users.findFirst({
                                                 ~~~~~

server/src/auth/auth.service.ts:779:25 - error TS2561: Object literal may only specify known properties, but 'passwordHash' does not exist in type '{ email?: string | SQL<unknown> | PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}> | undefined; firstName?: string | SQL<...> | PgColumn<...> | undefined; ... 8 more ...; updatedAt?: Date | ... 2 more ... | undefined; }'. Did you mean to write 'password'?

779                         passwordHash: hashedPassword,
                            ~~~~~~~~~~~~

server/src/auth/auth.service.ts:780:51 - error TS2339: Property 'tokenVersion' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

780                         tokenVersion: sql`${users.tokenVersion} + 1`,
                                                      ~~~~~~~~~~~~

server/src/auth/auth.service.ts:811:62 - error TS18046: 'error' is of type 'unknown'.

811                 logger.warn(`Auth error changing password: ${error.message}`, {
                                                                 ~~~~~

server/src/auth/auth.service.ts:813:27 - error TS18046: 'error' is of type 'unknown'.

813                     code: error.code
                              ~~~~~

server/src/auth/auth.service.ts:837:46 - error TS2339: Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?"> | { [x: string]: RelationalQueryBuilder<ExtractTablesWithRelations<any>, { ...; }>; }'.
  Property 'users' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?">'.

837             const user = await this.db.query.users.findFirst({
                                                 ~~~~~

server/src/auth/auth.service.ts:886:31 - error TS2551: Property 'setex' does not exist on type 'RedisWithFallback'. Did you mean 'set'?

886             await redisClient.setex(
                                  ~~~~~

  server/utils/redis.ts:73:9
    73   async set(key: string, value: any, ttlMs?: number) {
               ~~~
    'set' is declared here.

server/src/auth/auth.service.ts:956:21 - error TS2561: Object literal may only specify known properties, but 'passwordHash' does not exist in type '{ email?: string | SQL<unknown> | PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}> | undefined; firstName?: string | SQL<...> | PgColumn<...> | undefined; ... 8 more ...; updatedAt?: Date | ... 2 more ... | undefined; }'. Did you mean to write 'password'?

956                     passwordHash: hashedPassword,
                        ~~~~~~~~~~~~

server/src/auth/auth.service.ts:957:47 - error TS2339: Property 'tokenVersion' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

957                     tokenVersion: sql`${users.tokenVersion} + 1`,
                                                  ~~~~~~~~~~~~

server/src/auth/auth.service.ts:986:21 - error TS2353: Object literal may only specify known properties, and 'tokenVersion' does not exist in type '{ email?: string | SQL<unknown> | PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}> | undefined; firstName?: string | SQL<...> | PgColumn<...> | undefined; ... 8 more ...; updatedAt?: Date | ... 2 more ... | undefined; }'.

986                     tokenVersion: sql`${users.tokenVersion} + 1`,
                        ~~~~~~~~~~~~

server/src/auth/auth.service.ts:986:47 - error TS2339: Property 'tokenVersion' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

986                     tokenVersion: sql`${users.tokenVersion} + 1`,
                                                  ~~~~~~~~~~~~

server/src/auth/auth.service.ts:992:44 - error TS2339: Property 'keys' does not exist on type 'RedisWithFallback'.

992             const keys = await redisClient.keys(`user:${userId}:refresh:*`);
                                               ~~~~

server/src/auth/auth.service.ts:994:44 - error TS7006: Parameter 'key' implicitly has an 'any' type.

994                 await Promise.all(keys.map(key => redisClient.del(key)));
                                               ~~~

server/src/auth/auth.service.ts:1027:27 - error TS2551: Property 'setex' does not exist on type 'RedisWithFallback'. Did you mean 'set'?

1027         await redisClient.setex(
                               ~~~~~

  server/utils/redis.ts:73:9
    73   async set(key: string, value: any, ttlMs?: number) {
               ~~~
    'set' is declared here.

server/src/auth/controllers/auth.controller.ts:9:8 - error TS2307: Cannot find module '@shared/src/types/auth/dto/index.js' or its corresponding type declarations.

9 } from '@shared/src/types/auth/dto/index.js';
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/controllers/auth.controller.ts:10:35 - error TS2307: Cannot find module '@shared/src/types/auth/dto/auth-response.dto.js' or its corresponding type declarations.

10 import type { AuthResponse } from '@shared/src/types/auth/dto/auth-response.dto.js';
                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/controllers/auth.controller.ts:11:27 - error TS2307: Cannot find module '@shared/src/types/auth/user.js' or its corresponding type declarations.

11 import type { User } from '@shared/src/types/auth/user.js';
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/controllers/auth.controller.ts:12:31 - error TS2307: Cannot find module '@shared/src/types/auth/permissions.js' or its corresponding type declarations.

12 import type { UserRole } from '@shared/src/types/auth/permissions.js';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/index.ts:2:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

2 export * from './jwt/index.ts';
                ~~~~~~~~~~~~~~~~

server/src/auth/index.ts:3:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

3 export * from './middleware/index.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/index.ts:6:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

6 export * from './services/auth.service.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/index.ts:7:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

7 export * from './repositories/user.repository.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/index.ts:8:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

8 export * from './repositories/refresh-token.repository.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/index.ts:11:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

11 export * from './controllers/auth.controller.ts';
                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/index.ts:14:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

14 export * from './auth.container.ts';
                 ~~~~~~~~~~~~~~~~~~~~~

server/src/auth/index.ts:17:10 - error TS2305: Module '"./auth.container.ts"' has no exported member 'registerAuthRoutes'.

17 export { registerAuthRoutes } from './auth.container.ts';
            ~~~~~~~~~~~~~~~~~~

server/src/auth/index.ts:17:36 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

17 export { registerAuthRoutes } from './auth.container.ts';
                                      ~~~~~~~~~~~~~~~~~~~~~

server/src/auth/interfaces/auth.service.interface.ts:10:8 - error TS2307: Cannot find module '@shared/types' or its corresponding type declarations.

10 } from '@shared/types';
          ~~~~~~~~~~~~~~~

server/src/auth/jwt/index.ts:6:38 - error TS2307: Cannot find module '../../../../db/redis.js' or its corresponding type declarations.

6 import { redisClient as redis } from '../../../../db/redis.js';
                                       ~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/jwt/index.ts:7:24 - error TS2307: Cannot find module '../../../../utils/logger.js' or its corresponding type declarations.

7 import { logger } from '../../../../utils/logger.js';
                         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/jwt/index.ts:35:3 - error TS2305: Module '"../../../../shared/src/types/auth/jwt.js"' has no exported member 'TokenPayload'.

35   TokenPayload,
     ~~~~~~~~~~~~

server/src/auth/jwt/index.ts:40:49 - error TS2307: Cannot find module '../../../../shared/src/types/auth/permissions.js' or its corresponding type declarations.

40 import { UserRole, getPermissionsForRole } from '../../../../shared/src/types/auth/permissions.js';
                                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/jwt/index.ts:354:52 - error TS7006: Parameter 'tokenId' implicitly has an 'any' type.

354         const deletePromises = tokenIds.map(async (tokenId) => {
                                                       ~~~~~~~

server/src/auth/jwt/index.ts:356:48 - error TS7006: Parameter 'err' implicitly has an 'any' type.

356             await redis.del(userInfoKey).catch(err => {
                                                   ~~~

server/src/auth/jwt/index.ts:590:44 - error TS7006: Parameter 'err' implicitly has an 'any' type.

590         await redis.del(userInfoKey).catch(err => {
                                               ~~~

server/src/auth/jwt/index.ts:651:52 - error TS7006: Parameter 'tokenId' implicitly has an 'any' type.

651         const deletePromises = tokenIds.map(async (tokenId) => {
                                                       ~~~~~~~

server/src/auth/jwt/index.ts:653:48 - error TS7006: Parameter 'err' implicitly has an 'any' type.

653             await redis.del(userInfoKey).catch(err => {
                                                   ~~~

server/src/auth/jwt/types.ts:8:3 - error TS2305: Module '"../../../../shared/src/types/auth/jwt.js"' has no exported member 'TokenPayload'.

8   TokenPayload,
    ~~~~~~~~~~~~

server/src/auth/jwt/types.ts:11:31 - error TS2307: Cannot find module '../../../../shared/src/types/auth/permissions.js' or its corresponding type declarations.

11 import type { UserRole } from '../../../../shared/src/types/auth/permissions.js';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/jwt/utils.ts:4:38 - error TS6307: File '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/utils/redis.ts' is not listed within the file list of project '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/tsconfig.json'. Projects must list all files or use an 'include' pattern.
  The file is in the program because:
    Imported via '../../../utils/redis.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/src/auth/jwt/utils.ts'
    Imported via '../../utils/redis.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/src/auth/auth.service.ts'
  File is ECMAScript module because '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/package.json' has field "type" with value "module"

4 import { redisClient as redis } from '../../../utils/redis.js';
                                       ~~~~~~~~~~~~~~~~~~~~~~~~~

  server/src/auth/auth.service.ts:13:29
    13 import { redisClient } from '../../utils/redis.js';
                                   ~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.

server/src/auth/jwt/utils.ts:114:21 - error TS2352: Conversion of type 'Jwt & JwtPayload & void' to type 'T' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  'T' could be instantiated with an arbitrary type which could be unrelated to 'Jwt & JwtPayload & void'.

114     const decoded = verify(token, secret, {
                        ~~~~~~~~~~~~~~~~~~~~~~~
115       ...options,
    ~~~~~~~~~~~~~~~~~
...
117       ignoreExpiration: false,
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
118     }) as T;
    ~~~~~~~~~~~

server/src/auth/jwt/utils.ts:114:43 - error TS2769: No overload matches this call.
  The last overload gave the following error.
    Argument of type '{ algorithms: any; ignoreExpiration: false; issuer?: string; audience?: string | string[]; subject?: string; }' is not assignable to parameter of type 'VerifyOptions'.
      Types of property 'audience' are incompatible.
        Type 'string | string[] | undefined' is not assignable to type 'string | RegExp | [string | RegExp, ...(string | RegExp)[]] | undefined'.
          Type 'string[]' is not assignable to type 'string | RegExp | [string | RegExp, ...(string | RegExp)[]] | undefined'.
            Type 'string[]' is not assignable to type '[string | RegExp, ...(string | RegExp)[]]'.
              Source provides no match for required element at position 0 in target.

114     const decoded = verify(token, secret, {
                                              ~
115       ...options,
    ~~~~~~~~~~~~~~~~~
...
117       ignoreExpiration: false,
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
118     }) as T;
    ~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/@types+jsonwebtoken@9.0.10/node_modules/@types/jsonwebtoken/index.d.ts:256:17
    256 export function verify(
                        ~~~~~~
    The last overload is declared here.

server/src/auth/jwt/utils.ts:135:28 - error TS2344: Type 'T' does not satisfy the constraint 'BaseJwtPayload'.

135 ): TokenVerificationResult<T> {
                               ~

  server/src/auth/jwt/utils.ts:130:47
    130 export function createTokenVerificationResult<T = JwtPayload>(
                                                      ~~~~~~~~~~~~~~
    This type parameter might need an `extends BaseJwtPayload` constraint.

server/src/auth/jwt/utils.ts:146:32 - error TS2344: Type 'T' does not satisfy the constraint 'BaseJwtPayload'.

146   } as TokenVerificationResult<T>;
                                   ~

  server/src/auth/jwt/utils.ts:130:47
    130 export function createTokenVerificationResult<T = JwtPayload>(
                                                      ~~~~~~~~~~~~~~
    This type parameter might need an `extends BaseJwtPayload` constraint.

server/src/auth/middleware/index.ts:2:29 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

2 import { verifyToken } from '../jwt/index.ts';
                              ~~~~~~~~~~~~~~~~~

server/src/auth/middleware/index.ts:3:15 - error TS2305: Module '"@shared/src/types/auth/index.js"' has no exported member 'TokenVerificationResult'.

3 import type { TokenVerificationResult, AuthUser } from '@shared/src/types/auth/index.js';
                ~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/middleware/index.ts:4:24 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

4 import { logger } from '@server/utils/logger.ts';
                         ~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/middleware/index.ts:5:23 - error TS2307: Cannot find module '@server/db/redis.js' or its corresponding type declarations.

5 import { redis } from '@server/db/redis.js';
                        ~~~~~~~~~~~~~~~~~~~~~

server/src/auth/middleware/index.ts:10:13 - error TS2717: Subsequent property declarations must have the same type.  Property 'user' must be of type 'User | undefined', but here has type 'AuthUser | undefined'.

10             user?: AuthUser;
               ~~~~

  server/src/express-augmentations.d.ts:21:7
    21       user?: User;
             ~~~~
    'user' was also declared here.

server/src/auth/middleware/index.ts:77:13 - error TS2353: Object literal may only specify known properties, and 'sessionId' does not exist in type '{ id: string; email: string; role: string; organizationId?: string | null | undefined; }'.

77             sessionId: result.payload.session_id
               ~~~~~~~~~

server/src/auth/repositories/refresh-token.ts:3:20 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

3 import { db } from '../../../db.ts';
                     ~~~~~~~~~~~~~~~~

server/src/auth/repositories/refresh-token.ts:3:20 - error TS6307: File '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/db.ts' is not listed within the file list of project '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/tsconfig.json'. Projects must list all files or use an 'include' pattern.
  File is ECMAScript module because '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/package.json' has field "type" with value "module"

3 import { db } from '../../../db.ts';
                     ~~~~~~~~~~~~~~~~

server/src/auth/repositories/refresh-token.ts:4:10 - error TS2305: Module '"../../../db/schema.js"' has no exported member 'refreshTokens'.

4 import { refreshTokens, type RefreshToken } from '../../../db/schema.js';
           ~~~~~~~~~~~~~

server/src/auth/repositories/refresh-token.ts:4:30 - error TS2305: Module '"../../../db/schema.js"' has no exported member 'RefreshToken'.

4 import { refreshTokens, type RefreshToken } from '../../../db/schema.js';
                               ~~~~~~~~~~~~

server/src/auth/repositories/refresh-token.ts:6:2 - error TS1361: 'Injectable' cannot be used as a value because it was imported using 'import type'.

6 @Injectable()
   ~~~~~~~~~~

  server/src/auth/repositories/refresh-token.ts:2:15
    2 import type { Injectable, Logger } from '@nestjs/common';
                    ~~~~~~~~~~
    'Injectable' was imported here.

server/src/auth/repositories/refresh-token.ts:7:14 - error TS2420: Class 'RefreshTokenRepositoryImpl' incorrectly implements interface 'RefreshTokenRepository'.
  Type 'RefreshTokenRepositoryImpl' is missing the following properties from type 'RefreshTokenRepository': revokeByUserId, revokeByToken, deleteExpired

7 export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
               ~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/repositories/refresh-token.ts:8:35 - error TS1361: 'Logger' cannot be used as a value because it was imported using 'import type'.

8     private readonly logger = new Logger(RefreshTokenRepositoryImpl.name);
                                    ~~~~~~

  server/src/auth/repositories/refresh-token.ts:2:27
    2 import type { Injectable, Logger } from '@nestjs/common';
                                ~~~~~~
    'Logger' was imported here.

server/src/auth/repositories/refresh-token.ts:77:24 - error TS2339: Property 'rowCount' does not exist on type 'RowList<never[]>'.

77             if (result.rowCount === 0) {
                          ~~~~~~~~

server/src/auth/repositories/refresh-token.ts:110:47 - error TS2339: Property 'rowCount' does not exist on type 'RowList<never[]>'.

110             this.logger.log(`Deleted ${result.rowCount} expired refresh tokens`);
                                                  ~~~~~~~~

server/src/auth/repositories/refresh-token.ts:111:27 - error TS2339: Property 'rowCount' does not exist on type 'RowList<never[]>'.

111             return result.rowCount || 0;
                              ~~~~~~~~

server/src/auth/repositories/user.repository.ts:13:14 - error TS2420: Class 'UserRepositoryImpl' incorrectly implements interface 'UserRepository'.
  Type 'UserRepositoryImpl' is missing the following properties from type 'UserRepository': setPasswordResetToken, clearPasswordResetToken

13 export class UserRepositoryImpl implements AuthUserRepository, BaseRepository<User, string, any, any> {
                ~~~~~~~~~~~~~~~~~~

server/src/auth/repositories/user.repository.ts:58:32 - error TS2339: Property 'mapToModel' does not exist on type 'UserRepository & BaseRepository<{ id: string; email: string; role: "admin" | "user" | "super_admin"; metadata: Metadata | null; createdAt: Date; updatedAt: Date; ... 4 more ...; password: string; }, string, any, any>'.

58     return this.userRepository.mapToModel(data);
                                  ~~~~~~~~~~

server/src/auth/repositories/user.repository.ts:69:21 - error TS2345: Argument of type '{ message: string; }' is not assignable to parameter of type 'LogEntry'.
  Property 'level' is missing in type '{ message: string; }' but required in type 'LogEntry'.

69     this.logger.log({ message: `Incrementing failed login attempts for user ${userId}` });
                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/winston@3.17.0/node_modules/winston/index.d.ts:67:5
    67     level: string;
           ~~~~~
    'level' is declared here.

server/src/auth/repositories/user.repository.ts:74:21 - error TS2345: Argument of type '{ message: string; }' is not assignable to parameter of type 'LogEntry'.
  Property 'level' is missing in type '{ message: string; }' but required in type 'LogEntry'.

74     this.logger.log({ message: `Resetting failed login attempts for user ${userId}` });
                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/winston@3.17.0/node_modules/winston/index.d.ts:67:5
    67     level: string;
           ~~~~~
    'level' is declared here.

server/src/auth/repositories/user.repository.ts:79:21 - error TS2345: Argument of type '{ message: string; }' is not assignable to parameter of type 'LogEntry'.
  Property 'level' is missing in type '{ message: string; }' but required in type 'LogEntry'.

79     this.logger.log({ message: `Locking account for user ${userId} until ${lockedUntil}` });
                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/winston@3.17.0/node_modules/winston/index.d.ts:67:5
    67     level: string;
           ~~~~~
    'level' is declared here.

server/src/auth/repositories/user.repository.ts:84:21 - error TS2345: Argument of type '{ message: string; context: { ipAddress: string; }; }' is not assignable to parameter of type 'LogEntry'.
  Property 'level' is missing in type '{ message: string; context: { ipAddress: string; }; }' but required in type 'LogEntry'.

84     this.logger.log({
                       ~
85       message: `Updating last login for user ${userId}`,
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
86       context: { ipAddress }
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
87     });
   ~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/winston@3.17.0/node_modules/winston/index.d.ts:67:5
    67     level: string;
           ~~~~~
    'level' is declared here.

server/src/auth/repositories/user.repository.ts:121:21 - error TS2345: Argument of type '{ message: string; }' is not assignable to parameter of type 'LogEntry'.
  Property 'level' is missing in type '{ message: string; }' but required in type 'LogEntry'.

121     this.logger.log({ message: `Verifying email for user ${userId}` });
                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/winston@3.17.0/node_modules/winston/index.d.ts:67:5
    67     level: string;
           ~~~~~
    'level' is declared here.

server/src/auth/repositories/user.repository.ts:128:21 - error TS2345: Argument of type '{ message: string; }' is not assignable to parameter of type 'LogEntry'.
  Property 'level' is missing in type '{ message: string; }' but required in type 'LogEntry'.

128     this.logger.log({ message: `Changing password for user ${userId}` });
                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/winston@3.17.0/node_modules/winston/index.d.ts:67:5
    67     level: string;
           ~~~~~
    'level' is declared here.

server/src/auth/repositories/user.repository.ts:134:21 - error TS2345: Argument of type '{ message: string; }' is not assignable to parameter of type 'LogEntry'.
  Property 'level' is missing in type '{ message: string; }' but required in type 'LogEntry'.

134     this.logger.log({ message: `Setting new password for user ${userId}` });
                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/winston@3.17.0/node_modules/winston/index.d.ts:67:5
    67     level: string;
           ~~~~~
    'level' is declared here.

server/src/auth/repositories/user.repository.ts:140:21 - error TS2345: Argument of type '{ message: string; }' is not assignable to parameter of type 'LogEntry'.
  Property 'level' is missing in type '{ message: string; }' but required in type 'LogEntry'.

140     this.logger.log({ message: `Updating password for user ${userId}` });
                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/winston@3.17.0/node_modules/winston/index.d.ts:67:5
    67     level: string;
           ~~~~~
    'level' is declared here.

server/src/auth/repositories/user.repository.ts:147:21 - error TS2345: Argument of type '{ message: string; context: { preferences: Record<string, any>; }; }' is not assignable to parameter of type 'LogEntry'.
  Property 'level' is missing in type '{ message: string; context: { preferences: Record<string, any>; }; }' but required in type 'LogEntry'.

147     this.logger.log({
                        ~
148       message: `Updating preferences for user ${userId}`,
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
149       context: { preferences }
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
150     });
    ~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/winston@3.17.0/node_modules/winston/index.d.ts:67:5
    67     level: string;
           ~~~~~
    'level' is declared here.

server/src/auth/repositories/user.repository.ts:157:21 - error TS2345: Argument of type '{ message: string; }' is not assignable to parameter of type 'LogEntry'.
  Property 'level' is missing in type '{ message: string; }' but required in type 'LogEntry'.

157     this.logger.log({ message: 'Finding user by reset token' });
                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/winston@3.17.0/node_modules/winston/index.d.ts:67:5
    67     level: string;
           ~~~~~
    'level' is declared here.

server/src/auth/services/auth.service.ts:8:8 - error TS2307: Cannot find module '@shared/src/types/auth/dto/index.js' or its corresponding type declarations.

8 } from '@shared/src/types/auth/dto/index.js';
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/services/auth.service.ts:11:26 - error TS2307: Cannot find module '@shared/src/types/auth/permissions.js' or its corresponding type declarations.

11 import { UserRole } from '@shared/src/types/auth/permissions.js';
                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/auth/services/auth.service.ts:52:52 - error TS2339: Property 'findById' does not exist on type 'UserRepository'.

52             const user = await this.userRepository.findById(userId);
                                                      ~~~~~~~~

server/src/auth/services/auth.service.ts:131:13 - error TS2739: Type '{ access_token: string; refresh_token: string; expires_at: string; token_type: string; }' is missing the following properties from type 'AuthTokens': accessToken, refreshToken, expiresAt, tokenType

131             tokens: {
                ~~~~~~

  shared/dist/src/types/auth/jwt.d.ts:70:5
    70     tokens: AuthTokens;
           ~~~~~~
    The expected type comes from property 'tokens' which is declared here on type 'AuthResponse'

server/src/auth/services/auth.service.ts:146:48 - error TS2339: Property 'findById' does not exist on type 'UserRepository'.

146         const user = await this.userRepository.findById(storedToken.userId);
                                                   ~~~~~~~~

server/src/auth/services/auth.service.ts:172:13 - error TS2739: Type '{ access_token: string; refresh_token: string; expires_at: string; token_type: string; }' is missing the following properties from type 'AuthTokens': accessToken, refreshToken, expiresAt, tokenType

172             tokens: {
                ~~~~~~

  shared/dist/src/types/auth/jwt.d.ts:70:5
    70     tokens: AuthTokens;
           ~~~~~~
    The expected type comes from property 'tokens' which is declared here on type 'AuthResponse'

server/src/auth/services/map-to-user.ts:1:35 - error TS2307: Cannot find module '@shared/src/types/auth/dto/user-response.dto.js' or its corresponding type declarations.

1 import type { UserResponse } from '@shared/src/types/auth/dto/user-response.dto.js';
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/controllers/booking.controller.ts:3:15 - error TS2305: Module '"../../../db/schema.js"' has no exported member 'Booking'.

3 import type { Booking } from '../../../db/schema.js';
                ~~~~~~~

server/src/common/controllers/booking.controller.ts:54:43 - error TS2345: Argument of type '{ type: "flight" | "hotel" | "other" | "activity" | "car" | "train"; tripId: string; metadata?: Record<string, unknown> | undefined; status?: "pending" | "completed" | "confirmed" | "cancelled" | undefined; ... 7 more ...; providerBookingId?: string | undefined; }' is not assignable to parameter of type 'CreateBookingDto'.
  Type '{ type: "flight" | "hotel" | "other" | "activity" | "car" | "train"; tripId: string; metadata?: Record<string, unknown> | undefined; status?: "pending" | "completed" | "confirmed" | "cancelled" | undefined; ... 7 more ...; providerBookingId?: string | undefined; }' is missing the following properties from type 'CreateBookingDto': userId, organizationId

54         return this.bookingService.create(createBookingDto);
                                             ~~~~~~~~~~~~~~~~

server/src/common/controllers/booking.controller.ts:65:62 - error TS2345: Argument of type '{ metadata?: Record<string, unknown> | undefined; type?: "flight" | "hotel" | "other" | "activity" | "car" | "train" | undefined; status?: "pending" | "completed" | "confirmed" | "cancelled" | undefined; ... 8 more ...; providerBookingId?: string | undefined; }' is not assignable to parameter of type 'UpdateBookingDto'.
  Types of property 'type' are incompatible.
    Type '"flight" | "hotel" | "other" | "activity" | "car" | "train" | undefined' is not assignable to type 'BookingType | undefined'.
      Type '"car"' is not assignable to type 'BookingType | undefined'.

65         const booking = await this.bookingService.update(id, updateData);
                                                                ~~~~~~~~~~

server/src/common/middleware/auth.middleware.ts:3:26 - error TS2307: Cannot find module '@shared/src/types/auth/permissions.js' or its corresponding type declarations.

3 import { UserRole } from '@shared/src/types/auth/permissions.js';
                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/middleware/permission.middleware.ts:2:36 - error TS2307: Cannot find module 'inversify' or its corresponding type declarations.

2 import { injectable, inject } from 'inversify';
                                     ~~~~~~~~~~~

server/src/common/middleware/permission.middleware.ts:3:23 - error TS2307: Cannot find module '../../types.js' or its corresponding type declarations.

3 import { TYPES } from '../../types.js';
                        ~~~~~~~~~~~~~~~~

server/src/common/middleware/permission.middleware.ts:5:43 - error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.

5 import { createApiError, ErrorType } from '../types';
                                            ~~~~~~~~~~

server/src/common/middleware/permission.middleware.ts:6:52 - error TS2307: Cannot find module '@shared/utils/permissions' or its corresponding type declarations.

6 import { PermissionManager, checkPermission } from '@shared/utils/permissions';
                                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/middleware/permission.middleware.ts:7:75 - error TS2307: Cannot find module '@shared/src/types/auth/permissions' or its corresponding type declarations.

7 import { UserRole, ResourceType, PermissionAction, PermissionLevel } from '@shared/src/types/auth/permissions';
                                                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/middleware/permission.middleware.ts:12:7 - error TS2717: Subsequent property declarations must have the same type.  Property 'user' must be of type 'User | undefined', but here has type '{ [key: string]: any; id: string; email: string; role: UserRole; organizationId: string | null; permissions?: string[] | undefined; } | undefined'.

12       user?: {
         ~~~~

  server/src/express-augmentations.d.ts:21:7
    21       user?: User;
             ~~~~
    'user' was also declared here.

server/src/common/middleware/standardized-error-handler.middleware.ts:1:15 - error TS2305: Module '"../../express-augmentations.ts"' has no exported member 'Request'.

1 import type { Request, Response, NextFunction } from '../../express-augmentations.ts';
                ~~~~~~~

server/src/common/middleware/standardized-error-handler.middleware.ts:1:24 - error TS2305: Module '"../../express-augmentations.ts"' has no exported member 'Response'.

1 import type { Request, Response, NextFunction } from '../../express-augmentations.ts';
                         ~~~~~~~~

server/src/common/middleware/standardized-error-handler.middleware.ts:1:34 - error TS2305: Module '"../../express-augmentations.ts"' has no exported member 'NextFunction'.

1 import type { Request, Response, NextFunction } from '../../express-augmentations.ts';
                                   ~~~~~~~~~~~~

server/src/common/middleware/standardized-error-handler.middleware.ts:10:6 - error TS1361: 'ErrorType' cannot be used as a value because it was imported using 'import type'.

10     [ErrorType.UNAUTHORIZED]: 401,
        ~~~~~~~~~

  server/src/common/middleware/standardized-error-handler.middleware.ts:3:25
    3 import type { ApiError, ErrorType } from '../types/index.js';
                              ~~~~~~~~~
    'ErrorType' was imported here.

server/src/common/middleware/standardized-error-handler.middleware.ts:11:6 - error TS1361: 'ErrorType' cannot be used as a value because it was imported using 'import type'.

11     [ErrorType.FORBIDDEN]: 403,
        ~~~~~~~~~

  server/src/common/middleware/standardized-error-handler.middleware.ts:3:25
    3 import type { ApiError, ErrorType } from '../types/index.js';
                              ~~~~~~~~~
    'ErrorType' was imported here.

server/src/common/middleware/standardized-error-handler.middleware.ts:12:6 - error TS1361: 'ErrorType' cannot be used as a value because it was imported using 'import type'.

12     [ErrorType.NOT_FOUND]: 404,
        ~~~~~~~~~

  server/src/common/middleware/standardized-error-handler.middleware.ts:3:25
    3 import type { ApiError, ErrorType } from '../types/index.js';
                              ~~~~~~~~~
    'ErrorType' was imported here.

server/src/common/middleware/standardized-error-handler.middleware.ts:13:6 - error TS1361: 'ErrorType' cannot be used as a value because it was imported using 'import type'.

13     [ErrorType.BAD_REQUEST]: 400,
        ~~~~~~~~~

  server/src/common/middleware/standardized-error-handler.middleware.ts:3:25
    3 import type { ApiError, ErrorType } from '../types/index.js';
                              ~~~~~~~~~
    'ErrorType' was imported here.

server/src/common/middleware/standardized-error-handler.middleware.ts:14:6 - error TS1361: 'ErrorType' cannot be used as a value because it was imported using 'import type'.

14     [ErrorType.CONFLICT]: 409,
        ~~~~~~~~~

  server/src/common/middleware/standardized-error-handler.middleware.ts:3:25
    3 import type { ApiError, ErrorType } from '../types/index.js';
                              ~~~~~~~~~
    'ErrorType' was imported here.

server/src/common/middleware/standardized-error-handler.middleware.ts:15:6 - error TS1361: 'ErrorType' cannot be used as a value because it was imported using 'import type'.

15     [ErrorType.INTERNAL_SERVER_ERROR]: 500,
        ~~~~~~~~~

  server/src/common/middleware/standardized-error-handler.middleware.ts:3:25
    3 import type { ApiError, ErrorType } from '../types/index.js';
                              ~~~~~~~~~
    'ErrorType' was imported here.

server/src/common/middleware/standardized-error-handler.middleware.ts:33:23 - error TS1361: 'ErrorType' cannot be used as a value because it was imported using 'import type'.

33                 type: ErrorType.INTERNAL_SERVER_ERROR,
                         ~~~~~~~~~

  server/src/common/middleware/standardized-error-handler.middleware.ts:3:25
    3 import type { ApiError, ErrorType } from '../types/index.js';
                              ~~~~~~~~~
    'ErrorType' was imported here.

server/src/common/middleware/standardized-error-handler.middleware.ts:77:37 - error TS2304: Cannot find name 'ExtendedErrorResponse'.

77             (errorResponse.error as ExtendedErrorResponse).code = AppErrorCode.INTERNAL_SERVER_ERROR;
                                       ~~~~~~~~~~~~~~~~~~~~~

server/src/common/middleware/standardized-error-handler.middleware.ts:80:41 - error TS2304: Cannot find name 'ExtendedErrorResponse'.

80                 (errorResponse.error as ExtendedErrorResponse).stack = error.stack;
                                           ~~~~~~~~~~~~~~~~~~~~~

server/src/common/middleware/standardized-error-handler.middleware.ts:88:37 - error TS2304: Cannot find name 'ExtendedErrorResponse'.

88             (errorResponse.error as ExtendedErrorResponse).requestId = requestId;
                                       ~~~~~~~~~~~~~~~~~~~~~

server/src/common/modules/booking.module.ts:2:35 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

2 import { BookingController } from '../controllers/booking.controller.ts';
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/modules/booking.module.ts:3:32 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

3 import { BookingService } from '../services/booking.service.ts';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/modules/booking.module.ts:4:36 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

4 import { RepositoriesModule } from '../repositories/repositories.module.ts';
                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/pipes/validation.pipe.ts:51:9 - error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.
  No index signature with a parameter of type 'string' was found on type '{}'.

51         acc[err.property] = Object.values(err.constraints);
           ~~~~~~~~~~~~~~~~~

server/src/common/pipes/validation.pipe.ts:54:9 - error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.
  No index signature with a parameter of type 'string' was found on type '{}'.

54         acc[err.property] = this.flattenValidationErrors(err.children);
           ~~~~~~~~~~~~~~~~~

server/src/common/repositories/activity/activity.repository.ts:3:20 - error TS2307: Cannot find module '@shared/../server/db/db.js' or its corresponding type declarations.

3 import { db } from '@shared/../server/db/db.js';
                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/activity/activity.repository.ts:4:28 - error TS2307: Cannot find module '@shared/../server/db/schema.js' or its corresponding type declarations.

4 import { activities } from '@shared/../server/db/schema.js'; // Using path alias with .js extension
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/activity/activity.repository.ts:91:73 - error TS2339: Property 'mapToActivity' does not exist on type 'ActivityRepositoryImpl'.

91         return result.map((row: typeof activities.$inferSelect) => this.mapToActivity(row));
                                                                           ~~~~~~~~~~~~~

server/src/common/repositories/activity/activity.repository.ts:111:71 - error TS2339: Property 'mapToActivity' does not exist on type 'ActivityRepositoryImpl'.

111       return result.map((row: typeof activities.$inferSelect) => this.mapToActivity(row));
                                                                          ~~~~~~~~~~~~~

server/src/common/repositories/activity/activity.repository.ts:226:73 - error TS2339: Property 'mapToActivity' does not exist on type 'ActivityRepositoryImpl'.

226         return result.map((row: typeof activities.$inferSelect) => this.mapToActivity(row));
                                                                            ~~~~~~~~~~~~~

server/src/common/repositories/activity/activity.repository.ts:364:73 - error TS2339: Property 'mapToActivity' does not exist on type 'ActivityRepositoryImpl'.

364         return result.map((row: typeof activities.$inferSelect) => this.mapToActivity(row));
                                                                            ~~~~~~~~~~~~~

server/src/common/repositories/base.repository.ts:113:31 - error TS2345: Argument of type '(tx: NodePgTransaction<Record<string, unknown>, TablesRelationalConfig>) => Promise<R>' is not assignable to parameter of type '(tx: PgTransaction<NodePgQueryResultHKT, any, ExtractTablesWithRelations<any>>) => Promise<R>'.
  Types of parameters 'tx' and 'tx' are incompatible.
    Type 'PgTransaction<NodePgQueryResultHKT, any, ExtractTablesWithRelations<any>>' is not assignable to type 'NodePgTransaction<Record<string, unknown>, TablesRelationalConfig>'.
      Types of property 'query' are incompatible.
        Type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?"> | { [x: string]: RelationalQueryBuilder<ExtractTablesWithRelations<any>, { ...; }>; }' is not assignable to type '{ [x: string]: RelationalQueryBuilder<TablesRelationalConfig, TableRelationalConfig>; }'.
          Type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?">' is not assignable to type '{ [x: string]: RelationalQueryBuilder<TablesRelationalConfig, TableRelationalConfig>; }'.
            Index signature for type 'string' is missing in type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?">'.

113         return db.transaction(fn);
                                  ~~

server/src/common/repositories/booking/booking.repository.ts:4:26 - error TS2307: Cannot find module '../../../../db/bookingSchema.js' or its corresponding type declarations.

4 import { bookings } from '../../../../db/bookingSchema.js';
                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/index.ts:2:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

2 export * from './base.repository.interface.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/index.ts:3:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

3 export * from './organization/organization.repository.interface.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/index.ts:4:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

4 export * from './activity/activity.repository.interface.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/index.ts:5:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

5 export * from './user/user.repository.interface.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/index.ts:6:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

6 export * from './booking/booking.repository.interface.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/index.ts:8:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

8 export * from './base.repository.ts';
                ~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/index.ts:9:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

9 export * from './organization/organization.repository.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/index.ts:10:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

10 export * from './activity/activity.repository.ts';
                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/index.ts:11:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

11 export * from './booking/booking.repository.ts';
                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/index.ts:13:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

13 export * from './repositories.module.ts';
                 ~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/organization/organization.repository.interface.ts:10:8 - error TS2307: Cannot find module '@shared/types/organizations' or its corresponding type declarations.

10 } from '@shared/types/organizations';
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/organization/organization.repository.interface.ts:11:27 - error TS2307: Cannot find module '@shared/types/users' or its corresponding type declarations.

11 import type { User } from '@shared/types/users';
                             ~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/organization/organization.repository.ts:3:20 - error TS2307: Cannot find module '@shared/../server/db/db.js' or its corresponding type declarations.

3 import { db } from '@shared/../server/db/db.js';
                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/organization/organization.repository.ts:4:52 - error TS2307: Cannot find module '@shared/../server/db/schema.js' or its corresponding type declarations.

4 import { organizations, organizationMembers } from '@shared/../server/db/schema.js';
                                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/organization/organization.repository.ts:16:23 - error TS2307: Cannot find module '@shared/../server/db/schema.js' or its corresponding type declarations.

16 import { users } from '@shared/../server/db/schema.js';
                         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/organization/organization.repository.ts:23:13 - error TS2416: Property 'mapToModel' in type 'OrganizationRepositoryImpl' is not assignable to the same property in base type 'BaseRepositoryImpl<Organization, string, CreateOrganizationData, UpdateOrganizationData>'.
  Type '(data: any) => Organization' is not assignable to type '(data: any) => Promise<Organization>'.
    Type 'Organization' is missing the following properties from type 'Promise<Organization>': then, catch, finally, [Symbol.toStringTag]

23   protected mapToModel(data: any /** FIXANYERROR: Replace 'any' */): Organization {
               ~~~~~~~~~~

server/src/common/repositories/organization/organization.repository.ts:105:26 - error TS7006: Parameter 'member' implicitly has an 'any' type.

105       return members.map(member => ({
                             ~~~~~~

server/src/common/repositories/organization/organization.repository.ts:109:30 - error TS2304: Cannot find name 'UserRole'.

109         role: member.role as UserRole,
                                 ~~~~~~~~

server/src/common/repositories/organization/organization.repository.ts:120:32 - error TS2304: Cannot find name 'UserRole'.

120           role: member.role as UserRole,
                                   ~~~~~~~~

server/src/common/repositories/repositories.module.ts:2:37 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

2 import { RepositoryProviders } from './repository.providers.ts';
                                      ~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/repository.providers.ts:2:36 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

2 import { TripRepositoryImpl } from '../../trips/repositories/trip.repository.ts';
                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/repository.providers.ts:3:44 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

3 import { OrganizationRepositoryImpl } from './organization/organization.repository.ts';
                                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/repository.providers.ts:4:40 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

4 import { ActivityRepositoryImpl } from './activity/activity.repository.ts';
                                         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/repository.providers.ts:5:39 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

5 import { BookingRepositoryImpl } from './booking/booking.repository.ts';
                                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/repository.providers.ts:6:62 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

6 import { UserRepositoryImpl as AuthUserRepositoryImpl } from '../../auth/repositories/user.repository.ts';
                                                               ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/repository.providers.ts:7:44 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

7 import { RefreshTokenRepositoryImpl } from '../../auth/repositories/refresh-token.repository.ts';
                                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:135:16 - error TS2339: Property 'settings' does not exist on type '{ id: string; email: string; role: "admin" | "user" | "super_admin"; metadata: Metadata | null; createdAt: Date; updatedAt: Date; firstName: string; lastName: string; emailVerified: boolean; lastLoginAt: Date | null; password: string; }'.

135     if (dbUser.settings) {
                   ~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:137:46 - error TS2339: Property 'settings' does not exist on type '{ id: string; email: string; role: "admin" | "user" | "super_admin"; metadata: Metadata | null; createdAt: Date; updatedAt: Date; firstName: string; lastName: string; emailVerified: boolean; lastLoginAt: Date | null; password: string; }'.

137         const parsedSettings = typeof dbUser.settings === 'string'
                                                 ~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:138:31 - error TS2339: Property 'settings' does not exist on type '{ id: string; email: string; role: "admin" | "user" | "super_admin"; metadata: Metadata | null; createdAt: Date; updatedAt: Date; firstName: string; lastName: string; emailVerified: boolean; lastLoginAt: Date | null; password: string; }'.

138           ? JSON.parse(dbUser.settings)
                                  ~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:139:20 - error TS2339: Property 'settings' does not exist on type '{ id: string; email: string; role: "admin" | "user" | "super_admin"; metadata: Metadata | null; createdAt: Date; updatedAt: Date; firstName: string; lastName: string; emailVerified: boolean; lastLoginAt: Date | null; password: string; }'.

139           : dbUser.settings;
                       ~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:152:24 - error TS2339: Property 'username' does not exist on type '{ id: string; email: string; role: "admin" | "user" | "super_admin"; metadata: Metadata | null; createdAt: Date; updatedAt: Date; firstName: string; lastName: string; emailVerified: boolean; lastLoginAt: Date | null; password: string; }'.

152       username: dbUser.username || `${dbUser.firstName?.toLowerCase()}.${dbUser.lastName?.toLowerCase()}`,
                           ~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:158:30 - error TS2339: Property 'organizationId' does not exist on type '{ id: string; email: string; role: "admin" | "user" | "super_admin"; metadata: Metadata | null; createdAt: Date; updatedAt: Date; firstName: string; lastName: string; emailVerified: boolean; lastLoginAt: Date | null; password: string; }'.

158       organizationId: dbUser.organizationId || null,
                                 ~~~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:160:24 - error TS2339: Property 'isActive' does not exist on type '{ id: string; email: string; role: "admin" | "user" | "super_admin"; metadata: Metadata | null; createdAt: Date; updatedAt: Date; firstName: string; lastName: string; emailVerified: boolean; lastLoginAt: Date | null; password: string; }'.

160       isActive: dbUser.isActive ?? true,
                           ~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:180:9 - error TS2345: Argument of type 'SQL<unknown> | undefined' is not assignable to parameter of type 'SQL<unknown>'.
  Type 'undefined' is not assignable to type 'SQL<unknown>'.

180         or(
            ~~~
181           ilike(users.email, searchTerm),
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
...
184           ilike(users.lastName, searchTerm)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
185         )
    ~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:182:23 - error TS2339: Property 'username' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

182           ilike(users.username, searchTerm),
                          ~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:190:23 - error TS2769: No overload matches this call.
  Overload 1 of 3, '(left: PgColumn<{ name: "role"; tableName: "users"; dataType: "string"; columnType: "PgEnumColumn"; data: "admin" | "user" | "super_admin"; driverParam: string; notNull: true; hasDefault: true; isPrimaryKey: false; ... 5 more ...; generated: undefined; }, {}, {}>, right: "admin" | ... 2 more ... | SQLWrapper): SQL<...>', gave the following error.
    Argument of type 'UserRole' is not assignable to parameter of type '"admin" | "user" | "super_admin" | SQLWrapper'.
      Type '"guest"' is not assignable to type '"admin" | "user" | "super_admin" | SQLWrapper'.
  Overload 2 of 3, '(left: Aliased<"admin" | "guest" | "manager" | "member">, right: "admin" | "guest" | "manager" | "member" | SQLWrapper): SQL<unknown>', gave the following error.
    Argument of type 'PgColumn<{ name: "role"; tableName: "users"; dataType: "string"; columnType: "PgEnumColumn"; data: "admin" | "user" | "super_admin"; driverParam: string; notNull: true; hasDefault: true; isPrimaryKey: false; ... 5 more ...; generated: undefined; }, {}, {}>' is not assignable to parameter of type 'Aliased<"admin" | "guest" | "manager" | "member">'.
      Type 'PgColumn<{ name: "role"; tableName: "users"; dataType: "string"; columnType: "PgEnumColumn"; data: "admin" | "user" | "super_admin"; driverParam: string; notNull: true; hasDefault: true; isPrimaryKey: false; ... 5 more ...; generated: undefined; }, {}, {}>' is missing the following properties from type 'Aliased<"admin" | "guest" | "manager" | "member">': sql, fieldAlias
  Overload 3 of 3, '(left: never, right: unknown): SQL<unknown>', gave the following error.
    Argument of type 'PgColumn<{ name: "role"; tableName: "users"; dataType: "string"; columnType: "PgEnumColumn"; data: "admin" | "user" | "super_admin"; driverParam: string; notNull: true; hasDefault: true; isPrimaryKey: false; ... 5 more ...; generated: undefined; }, {}, {}>' is not assignable to parameter of type 'never'.

190       conditions.push(eq(users.role, params.role));
                          ~~


server/src/common/repositories/user/UserRepository.ts:194:32 - error TS2339: Property 'organizationId' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

194       conditions.push(eq(users.organizationId, params.organizationId));
                                   ~~~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:198:32 - error TS2339: Property 'isActive' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

198       conditions.push(eq(users.isActive, params.isActive));
                                   ~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:248:22 - error TS2339: Property 'organizationId' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

248             eq(users.organizationId, organizationId)
                         ~~~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:279:34 - error TS2339: Property 'isActive' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

279         conditions.push(eq(users.isActive, true));
                                     ~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:308:55 - error TS2345: Argument of type 'PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; isPrimaryKey: true; isAutoincrement: false; hasRuntimeDefault: false; enumValues: undefined; baseColumn: never; identity: undefined; generated: undefined; }, {}, {}...' is not assignable to parameter of type 'SQLWrapper | AnyColumn'.
  Type 'undefined' is not assignable to type 'SQLWrapper | AnyColumn'.

308       const orderByClause = sortOrder === 'asc' ? asc(orderByField) : desc(orderByField);
                                                          ~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:308:76 - error TS2345: Argument of type 'PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; isPrimaryKey: true; isAutoincrement: false; hasRuntimeDefault: false; enumValues: undefined; baseColumn: never; identity: undefined; generated: undefined; }, {}, {}...' is not assignable to parameter of type 'SQLWrapper | AnyColumn'.
  Type 'undefined' is not assignable to type 'SQLWrapper | AnyColumn'.

308       const orderByClause = sortOrder === 'asc' ? asc(orderByField) : desc(orderByField);
                                                                               ~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:361:59 - error TS2769: No overload matches this call.
  Overload 1 of 2, '(value: { email: string | SQL<unknown> | Placeholder<string, any>; firstName: string | SQL<unknown> | Placeholder<string, any>; lastName: string | SQL<unknown> | Placeholder<...>; ... 7 more ...; lastLoginAt?: Date | ... 3 more ... | undefined; }): PgInsertBase<...>', gave the following error.
    Argument of type '{ id: string; email: string; username: string; firstName: string | null; lastName: string | null; passwordHash: string; role: UserRole; organizationId: string | null; emailVerified: boolean; isActive: boolean; settings: string; createdAt: Date; updatedAt: Date; }' is not assignable to parameter of type '{ email: string | SQL<unknown> | Placeholder<string, any>; firstName: string | SQL<unknown> | Placeholder<string, any>; lastName: string | SQL<unknown> | Placeholder<...>; ... 7 more ...; lastLoginAt?: Date | ... 3 more ... | undefined; }'.
      Property 'password' is missing in type '{ id: string; email: string; username: string; firstName: string | null; lastName: string | null; passwordHash: string; role: UserRole; organizationId: string | null; emailVerified: boolean; isActive: boolean; settings: string; createdAt: Date; updatedAt: Date; }' but required in type '{ email: string | SQL<unknown> | Placeholder<string, any>; firstName: string | SQL<unknown> | Placeholder<string, any>; lastName: string | SQL<unknown> | Placeholder<...>; ... 7 more ...; lastLoginAt?: Date | ... 3 more ... | undefined; }'.
  Overload 2 of 2, '(values: { email: string | SQL<unknown> | Placeholder<string, any>; firstName: string | SQL<unknown> | Placeholder<string, any>; lastName: string | SQL<unknown> | Placeholder<...>; ... 7 more ...; lastLoginAt?: Date | ... 3 more ... | undefined; }[]): PgInsertBase<...>', gave the following error.
    Argument of type '{ id: string; email: string; username: string; firstName: string | null; lastName: string | null; passwordHash: string; role: UserRole; organizationId: string | null; emailVerified: boolean; isActive: boolean; settings: string; createdAt: Date; updatedAt: Date; }' is not assignable to parameter of type '{ email: string | SQL<unknown> | Placeholder<string, any>; firstName: string | SQL<unknown> | Placeholder<string, any>; lastName: string | SQL<unknown> | Placeholder<...>; ... 7 more ...; lastLoginAt?: Date | ... 3 more ... | undefined; }[]'.
      Type '{ id: string; email: string; username: string; firstName: string | null; lastName: string | null; passwordHash: string; role: UserRole; organizationId: string | null; emailVerified: boolean; isActive: boolean; settings: string; createdAt: Date; updatedAt: Date; }' is missing the following properties from type '{ email: string | SQL<unknown> | Placeholder<string, any>; firstName: string | SQL<unknown> | Placeholder<string, any>; lastName: string | SQL<unknown> | Placeholder<...>; ... 7 more ...; lastLoginAt?: Date | ... 3 more ... | undefined; }[]': length, pop, push, concat, and 29 more.

361       const [createdUser] = await db.insert(users).values(newUser).returning();
                                                              ~~~~~~~


server/src/common/repositories/user/UserRepository.ts:428:11 - error TS2353: Object literal may only specify known properties, and 'isActive' does not exist in type '{ email?: string | SQL<unknown> | PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}> | undefined; firstName?: string | SQL<...> | PgColumn<...> | undefined; ... 8 more ...; lastLoginAt?: Date | ... 3 more ... | undefined; }'.

428           isActive: false,
              ~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:433:14 - error TS18047: 'result.rowCount' is possibly 'null'.

433       return result.rowCount > 0;
                 ~~~~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:453:26 - error TS2551: Property 'passwordHash' does not exist on type '{ id: string; email: string; firstName: string; lastName: string; password: string; role: "admin" | "user" | "super_admin"; emailVerified: boolean; lastLoginAt: Date | null; metadata: Metadata | null; createdAt: Date; updatedAt: Date; }'. Did you mean 'password'?

453       if (!user || !user.passwordHash) {
                             ~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:458:67 - error TS2551: Property 'passwordHash' does not exist on type '{ id: string; email: string; firstName: string; lastName: string; password: string; role: "admin" | "user" | "super_admin"; emailVerified: boolean; lastLoginAt: Date | null; metadata: Metadata | null; createdAt: Date; updatedAt: Date; }'. Did you mean 'password'?

458       const isPasswordValid = await compare(currentPassword, user.passwordHash);
                                                                      ~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:468:11 - error TS2561: Object literal may only specify known properties, but 'passwordHash' does not exist in type '{ email?: string | SQL<unknown> | PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}> | undefined; firstName?: string | SQL<...> | PgColumn<...> | undefined; ... 8 more ...; lastLoginAt?: Date | ... 3 more ... | undefined; }'. Did you mean to write 'password'?

468           passwordHash: hashedPassword,
              ~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:473:14 - error TS18047: 'result.rowCount' is possibly 'null'.

473       return result.rowCount > 0;
                 ~~~~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:490:14 - error TS18047: 'result.rowCount' is possibly 'null'.

490       return result.rowCount > 0;
                 ~~~~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:505:20 - error TS2339: Property 'isActive' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

505           eq(users.isActive, true)
                       ~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:513:7 - error TS2322: Type 'Promise<boolean> & void' is not assignable to type 'boolean'.

513       return await compare(password, user.passwordHash);
          ~~~~~~

server/src/common/repositories/user/UserRepository.ts:513:38 - error TS2345: Argument of type '{}' is not assignable to parameter of type 'string'.

513       return await compare(password, user.passwordHash);
                                         ~~~~~~~~~~~~~~~~~

server/src/common/repositories/user/UserRepository.ts:552:25 - error TS2339: Property 'isActive' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

552         .where(eq(users.isActive, true));
                            ~~~~~~~~

server/src/common/repositories/user/user.repository.interface.ts:12:8 - error TS2307: Cannot find module '@shared/types/users' or its corresponding type declarations.

12 } from '@shared/types/users';
          ~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/user/user.repository.interface.ts:13:37 - error TS2307: Cannot find module '../base.repository.interface' or its corresponding type declarations.

13 import type { BaseRepository } from '../base.repository.interface';
                                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/user/user.repository.ts:5:17 - error TS2305: Module '"../../../../db/schema.js"' has no exported member 'userSettings'.

5 import { users, userSettings } from '../../../../db/schema.js';
                  ~~~~~~~~~~~~

server/src/common/repositories/user/user.repository.ts:6:27 - error TS2307: Cannot find module '../../../../db/auditLog.js' or its corresponding type declarations.

6 import { auditLogs } from '../../../../db/auditLog.js';
                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/repositories/user/user.repository.ts:7:31 - error TS2305: Module '"../../../../db/schema.js"' has no exported member 'UserSettings'.

7 import type { User as DbUser, UserSettings as DbUserSettings } from '../../../../db/schema.js';
                                ~~~~~~~~~~~~

server/src/common/repositories/user/user.repository.ts:111:22 - error TS2339: Property 'organizationId' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

111             eq(users.organizationId, organizationId)
                         ~~~~~~~~~~~~~~

server/src/common/repositories/user/user.repository.ts:169:23 - error TS2339: Property 'username' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

169           ilike(users.username, searchTerm)
                          ~~~~~~~~

server/src/common/repositories/user/user.repository.ts:177:33 - error TS2769: No overload matches this call.
  Overload 1 of 3, '(left: PgColumn<{ name: "role"; tableName: "users"; dataType: "string"; columnType: "PgEnumColumn"; data: "admin" | "user" | "super_admin"; driverParam: string; notNull: true; hasDefault: true; isPrimaryKey: false; ... 5 more ...; generated: undefined; }, {}, {}>, right: "admin" | ... 2 more ... | SQLWrapper): SQL<...>', gave the following error.
    Argument of type 'UserRole' is not assignable to parameter of type '"admin" | "user" | "super_admin" | SQLWrapper'.
      Type '"guest"' is not assignable to type '"admin" | "user" | "super_admin" | SQLWrapper'.
  Overload 2 of 3, '(left: Aliased<"admin" | "guest" | "manager" | "member">, right: "admin" | "guest" | "manager" | "member" | SQLWrapper): SQL<unknown>', gave the following error.
    Argument of type 'PgColumn<{ name: "role"; tableName: "users"; dataType: "string"; columnType: "PgEnumColumn"; data: "admin" | "user" | "super_admin"; driverParam: string; notNull: true; hasDefault: true; isPrimaryKey: false; ... 5 more ...; generated: undefined; }, {}, {}>' is not assignable to parameter of type 'Aliased<"admin" | "guest" | "manager" | "member">'.
      Type 'PgColumn<{ name: "role"; tableName: "users"; dataType: "string"; columnType: "PgEnumColumn"; data: "admin" | "user" | "super_admin"; driverParam: string; notNull: true; hasDefault: true; isPrimaryKey: false; ... 5 more ...; generated: undefined; }, {}, {}>' is missing the following properties from type 'Aliased<"admin" | "guest" | "manager" | "member">': sql, fieldAlias
  Overload 3 of 3, '(left: never, right: unknown): SQL<unknown>', gave the following error.
    Argument of type 'PgColumn<{ name: "role"; tableName: "users"; dataType: "string"; columnType: "PgEnumColumn"; data: "admin" | "user" | "super_admin"; driverParam: string; notNull: true; hasDefault: true; isPrimaryKey: false; ... 5 more ...; generated: undefined; }, {}, {}>' is not assignable to parameter of type 'never'.

177       if (role) conditions.push(eq(users.role, role));
                                    ~~


server/src/common/repositories/user/user.repository.ts:178:52 - error TS2339: Property 'organizationId' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

178       if (organizationId) conditions.push(eq(users.organizationId, organizationId));
                                                       ~~~~~~~~~~~~~~

server/src/common/repositories/user/user.repository.ts:180:34 - error TS2339: Property 'isActive' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

180         conditions.push(eq(users.isActive, isActive));
                                     ~~~~~~~~

server/src/common/repositories/user/user.repository.ts:182:34 - error TS2339: Property 'isActive' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

182         conditions.push(eq(users.isActive, true));
                                     ~~~~~~~~

server/src/common/repositories/user/user.repository.ts:215:27 - error TS2339: Property 'username' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

215         'username': users.username,
                              ~~~~~~~~

server/src/common/repositories/user/user.repository.ts:219:33 - error TS2339: Property 'organizationId' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

219         'organizationId': users.organizationId,
                                    ~~~~~~~~~~~~~~

server/src/common/repositories/user/user.repository.ts:221:27 - error TS2339: Property 'isActive' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

221         'isActive': users.isActive,
                              ~~~~~~~~

server/src/common/repositories/user/user.repository.ts:280:25 - error TS2339: Property 'organizationId' does not exist on type 'PgTableWithColumns<{ name: "users"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "users"; dataType: "string"; columnType: "PgUUID"; data: string; driverParam: string; notNull: true; hasDefault: true; ... 6 more ...; generated: undefined; }, {}, {}>; ... 9 more ...; updatedAt: PgColumn<...>; };...'.

280         .where(eq(users.organizationId, organizationId))
                            ~~~~~~~~~~~~~~

server/src/common/repositories/user/user.repository.ts:378:11 - error TS2353: Object literal may only specify known properties, and 'isActive' does not exist in type '{ email?: string | SQL<unknown> | PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}> | undefined; firstName?: string | SQL<...> | PgColumn<...> | undefined; ... 8 more ...; lastLoginAt?: Date | ... 3 more ... | undefined; }'.

378           isActive: false,
              ~~~~~~~~

server/src/common/repositories/user/user.repository.ts:395:11 - error TS2561: Object literal may only specify known properties, but 'passwordHash' does not exist in type '{ email?: string | SQL<unknown> | PgColumn<ColumnBaseConfig<ColumnDataType, string>, {}, {}> | undefined; firstName?: string | SQL<...> | PgColumn<...> | undefined; ... 8 more ...; lastLoginAt?: Date | ... 3 more ... | undefined; }'. Did you mean to write 'password'?

395           passwordHash,
              ~~~~~~~~~~~~

server/src/common/services/booking.service.ts:11:8 - error TS2307: Cannot find module '../../../../shared/types/bookings.js' or its corresponding type declarations.

11 } from '../../../../shared/types/bookings.js';
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/services/booking.service.ts:17:8 - error TS2307: Cannot find module '../../../db/bookingSchema.js' or its corresponding type declarations.

17 } from '../../../db/bookingSchema.js';
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/common/services/booking.service.ts:84:13 - error TS2393: Duplicate function implementation.

84     private normalizeDate(dateInput: string | number | Date | null | undefined): Date {
               ~~~~~~~~~~~~~

server/src/common/services/booking.service.ts:125:63 - error TS2345: Argument of type 'CreateBookingData' is not assignable to parameter of type 'Omit<BaseBooking, "id" | "createdAt" | "updatedAt" | "reference">'.
  Type 'CreateBookingData' is missing the following properties from type 'Omit<BaseBooking, "id" | "createdAt" | "updatedAt" | "reference">': type, status, startDate, endDate, totalPrice

125         const dbBooking = await this.bookingRepository.create(createData);
                                                                  ~~~~~~~~~~

server/src/common/services/booking.service.ts:195:13 - error TS2393: Duplicate function implementation.

195     private mapToSharedBooking(
                ~~~~~~~~~~~~~~~~~~

server/src/common/services/booking.service.ts:406:36 - error TS2339: Property 'reference' does not exist on type 'BaseBooking'.

406                 reference: booking.reference || `BOOK-${String(booking.id).substring(0, 8).toUpperCase()}`,
                                       ~~~~~~~~~

server/src/common/services/booking.service.ts:409:57 - error TS2339: Property 'bookingDate' does not exist on type 'BaseBooking'.

409                 bookingDate: this.normalizeDate(booking.bookingDate),
                                                            ~~~~~~~~~~~

server/src/common/services/booking.service.ts:410:38 - error TS2339: Property 'checkInDate' does not exist on type 'BaseBooking'.

410                 checkInDate: booking.checkInDate ? this.normalizeDate(booking.checkInDate) : null,
                                         ~~~~~~~~~~~

server/src/common/services/booking.service.ts:410:79 - error TS2339: Property 'checkInDate' does not exist on type 'BaseBooking'.

410                 checkInDate: booking.checkInDate ? this.normalizeDate(booking.checkInDate) : null,
                                                                                  ~~~~~~~~~~~

server/src/common/services/booking.service.ts:411:39 - error TS2339: Property 'checkOutDate' does not exist on type 'BaseBooking'.

411                 checkOutDate: booking.checkOutDate ? this.normalizeDate(booking.checkOutDate) : null,
                                          ~~~~~~~~~~~~

server/src/common/services/booking.service.ts:411:81 - error TS2339: Property 'checkOutDate' does not exist on type 'BaseBooking'.

411                 checkOutDate: booking.checkOutDate ? this.normalizeDate(booking.checkOutDate) : null,
                                                                                    ~~~~~~~~~~~~

server/src/common/services/booking.service.ts:412:40 - error TS2339: Property 'amount' does not exist on type 'BaseBooking'.

412                 amount: Number(booking.amount) || 0,
                                           ~~~~~~

server/src/common/services/booking.service.ts:421:37 - error TS2339: Property 'activityId' does not exist on type 'BaseBooking'.

421                 activityId: booking.activityId ? String(booking.activityId) : null,
                                        ~~~~~~~~~~

server/src/common/services/booking.service.ts:421:65 - error TS2339: Property 'activityId' does not exist on type 'BaseBooking'.

421                 activityId: booking.activityId ? String(booking.activityId) : null,
                                                                    ~~~~~~~~~~

server/src/common/services/booking.service.ts:423:45 - error TS2339: Property 'cancellationPolicy' does not exist on type 'BaseBooking'.

423                 cancellationPolicy: booking.cancellationPolicy || null,
                                                ~~~~~~~~~~~~~~~~~~

server/src/common/services/booking.service.ts:424:47 - error TS2339: Property 'cancellationDeadline' does not exist on type 'BaseBooking'.

424                 cancellationDeadline: booking.cancellationDeadline ?
                                                  ~~~~~~~~~~~~~~~~~~~~

server/src/common/services/booking.service.ts:425:48 - error TS2339: Property 'cancellationDeadline' does not exist on type 'BaseBooking'.

425                     this.normalizeDate(booking.cancellationDeadline) : null,
                                                   ~~~~~~~~~~~~~~~~~~~~

server/src/common/services/booking.service.ts:492:13 - error TS2393: Duplicate function implementation.

492     private normalizeDate(dateInput: string | number | Date | null | undefined): Date {
                ~~~~~~~~~~~~~

server/src/common/services/booking.service.ts:501:13 - error TS2393: Duplicate function implementation.

501     private mapToSharedBooking(
                ~~~~~~~~~~~~~~~~~~

server/src/common/services/error.service.ts:31:64 - error TS2345: Argument of type 'ErrorDetails' is not assignable to parameter of type 'Record<string, unknown> | undefined'.
  Type 'null' is not assignable to type 'Record<string, unknown> | undefined'.

31         return createApiError(ErrorType.UNAUTHORIZED, message, details);
                                                                  ~~~~~~~

server/src/common/services/error.service.ts:47:61 - error TS2345: Argument of type 'ErrorDetails' is not assignable to parameter of type 'Record<string, unknown> | undefined'.
  Type 'null' is not assignable to type 'Record<string, unknown> | undefined'.

47         return createApiError(ErrorType.FORBIDDEN, message, details);
                                                               ~~~~~~~

server/src/common/services/error.service.ts:63:61 - error TS2345: Argument of type 'ErrorDetails' is not assignable to parameter of type 'Record<string, unknown> | undefined'.
  Type 'null' is not assignable to type 'Record<string, unknown> | undefined'.

63         return createApiError(ErrorType.NOT_FOUND, message, details);
                                                               ~~~~~~~

server/src/common/services/error.service.ts:79:63 - error TS2345: Argument of type 'ErrorDetails' is not assignable to parameter of type 'Record<string, unknown> | undefined'.
  Type 'null' is not assignable to type 'Record<string, unknown> | undefined'.

79         return createApiError(ErrorType.BAD_REQUEST, message, details);
                                                                 ~~~~~~~

server/src/common/services/error.service.ts:90:63 - error TS2345: Argument of type 'ErrorDetails' is not assignable to parameter of type 'Record<string, unknown> | undefined'.
  Type 'null' is not assignable to type 'Record<string, unknown> | undefined'.

90         return createApiError(ErrorType.BAD_REQUEST, message, details);
                                                                 ~~~~~~~

server/src/common/services/error.service.ts:99:5 - error TS2393: Duplicate function implementation.

99     createConflictError(message = 'Resource conflict', details?: ErrorDetails): ApiError {
       ~~~~~~~~~~~~~~~~~~~

server/src/common/services/error.service.ts:101:60 - error TS2345: Argument of type 'ErrorDetails' is not assignable to parameter of type 'Record<string, unknown> | undefined'.
  Type 'null' is not assignable to type 'Record<string, unknown> | undefined'.

101         return createApiError(ErrorType.CONFLICT, message, details);
                                                               ~~~~~~~

server/src/common/services/error.service.ts:112:73 - error TS2345: Argument of type 'ErrorDetails' is not assignable to parameter of type 'Record<string, unknown> | undefined'.
  Type 'null' is not assignable to type 'Record<string, unknown> | undefined'.

112         return createApiError(ErrorType.INTERNAL_SERVER_ERROR, message, details);
                                                                            ~~~~~~~

server/src/common/services/error.service.ts:156:5 - error TS2393: Duplicate function implementation.

156     createConflictError(message = 'Resource conflict', details?: Record<string, unknown>): ApiError {
        ~~~~~~~~~~~~~~~~~~~

server/src/common/services/jwt.service.ts:16:3 - error TS2305: Module '"@shared/types/auth/index.js"' has no exported member 'User'.

16   User,
     ~~~~

server/src/common/services/jwt.service.ts:19:3 - error TS2305: Module '"@shared/types/auth/index.js"' has no exported member 'UserRole'.

19   UserRole,
     ~~~~~~~~

server/src/common/services/jwt.service.ts:125:38 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

125         throw new AuthErrorException(AuthErrorCode.TOKEN_REVOKED, 'Token has been revoked');
                                         ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/services/jwt.service.ts:129:23 - error TS2352: Conversion of type 'Jwt & JwtPayload & void' to type 'T' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  'T' could be instantiated with an arbitrary type which could be unrelated to 'Jwt & JwtPayload & void'.

129       const payload = verify(token, this.config.secret, {
                          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
130         issuer: this.config.issuer,
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
131         audience: this.config.audience,
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
132       }) as T;
    ~~~~~~~~~~~~~

server/src/common/services/jwt.service.ts:131:9 - error TS2769: No overload matches this call.
  The last overload gave the following error.
    Type 'string | string[]' is not assignable to type 'string | RegExp | [string | RegExp, ...(string | RegExp)[]] | undefined'.
      Type 'string[]' is not assignable to type 'string | RegExp | [string | RegExp, ...(string | RegExp)[]] | undefined'.
        Type 'string[]' is not assignable to type '[string | RegExp, ...(string | RegExp)[]]'.
          Source provides no match for required element at position 0 in target.

131         audience: this.config.audience,
            ~~~~~~~~

  ../../NestleIn/NestMapRepo/node_modules/.pnpm/@types+jsonwebtoken@9.0.10/node_modules/@types/jsonwebtoken/index.d.ts:256:17
    256 export function verify(
                        ~~~~~~
    The last overload is declared here.

server/src/common/services/jwt.service.ts:139:17 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

139           code: AuthErrorCode.INVALID_TOKEN,
                    ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/services/jwt.service.ts:155:35 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

155           expired: error.code === AuthErrorCode.EXPIRED_TOKEN
                                      ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/services/jwt.service.ts:165:17 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

165           code: AuthErrorCode.EXPIRED_TOKEN,
                    ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/services/jwt.service.ts:174:17 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

174           code: AuthErrorCode.INVALID_TOKEN,
                    ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/services/jwt.service.ts:183:15 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

183         code: AuthErrorCode.UNKNOWN_ERROR,
                  ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/services/jwt.service.ts:198:41 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

198         result.code as AuthErrorCode || AuthErrorCode.INVALID_TOKEN,
                                            ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/services/jwt.service.ts:208:36 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

208       throw new AuthErrorException(AuthErrorCode.TOKEN_REVOKED, 'Refresh token has been revoked');
                                       ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/services/jwt.service.ts:214:36 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

214       throw new AuthErrorException(AuthErrorCode.USER_NOT_FOUND, 'User not found');
                                       ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/services/jwt.service.ts:247:36 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

247       throw new AuthErrorException(AuthErrorCode.UNKNOWN_ERROR, 'Failed to revoke token');
                                       ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/services/jwt.service.ts:259:36 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

259       throw new AuthErrorException(AuthErrorCode.UNKNOWN_ERROR, 'Failed to invalidate user tokens');
                                       ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/services/jwt.service.ts:314:36 - error TS1361: 'AuthErrorCode' cannot be used as a value because it was imported using 'import type'.

314       throw new AuthErrorException(AuthErrorCode.UNKNOWN_ERROR, 'Failed to store refresh token');
                                       ~~~~~~~~~~~~~

  server/src/common/services/jwt.service.ts:18:3
    18   AuthErrorCode,
         ~~~~~~~~~~~~~
    'AuthErrorCode' was imported here.

server/src/common/types/user.types.ts:1:37 - error TS2307: Cannot find module '../../../../db/schema.js' or its corresponding type declarations.

1 import type { User as DbUser } from '../../../../db/schema.js';
                                      ~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/email/index.ts:1:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

1 export * from './interfaces/email.service.interface.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/email/index.ts:2:15 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

2 export * from './services/nodemailer-email.service.ts';
                ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/lib/types/mappers.ts:1:43 - error TS2307: Cannot find module '../../db/bookingSchema.ts' or its corresponding type declarations.

1 import type { Booking as DbBooking } from '../../db/bookingSchema.ts';
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/lib/types/mappers.ts:2:61 - error TS2307: Cannot find module '@shared/types/booking' or its corresponding type declarations.

2 import type { BaseBooking, ServerBooking, AnyBooking } from '@shared/types/booking';
                                                              ~~~~~~~~~~~~~~~~~~~~~~~

server/src/trips/interfaces/trip.repository.interface.ts:1:15 - error TS2305: Module '"../../../db/schema.js"' has no exported member 'Trip'.

1 import type { Trip, User } from '../../../db/schema.js';
                ~~~~

server/src/trips/interfaces/trip.service.interface.ts:1:15 - error TS2305: Module '"../../../db/schema.js"' has no exported member 'Trip'.

1 import type { Trip } from '../../../db/schema.js';
                ~~~~

server/src/trips/repositories/trip.repository.ts:4:10 - error TS2305: Module '"../../../db/schema.js"' has no exported member 'trips'.

4 import { trips as tripsTable, users as usersTable } from '../../../db/schema.js';
           ~~~~~

server/src/trips/repositories/trip.repository.ts:5:15 - error TS2305: Module '"../../../db/schema.js"' has no exported member 'Trip'.

5 import type { Trip, User } from '../../../db/schema.js';
                ~~~~

server/src/trips/repositories/trip.repository.ts:69:29 - error TS2339: Property 'username' does not exist on type '{ id: string; email: string; firstName: string; lastName: string; password: string; role: "admin" | "user" | "super_admin"; emailVerified: boolean; lastLoginAt: Date | null; metadata: Metadata | null; createdAt: Date; updatedAt: Date; }'.

69                     : user?.username || 'Unknown User',
                               ~~~~~~~~

server/src/trips/repositories/trip.repository.ts:85:45 - error TS2339: Property 'organizationId' does not exist on type '{ id: string; email: string; role: "admin" | "user" | "super_admin"; metadata: Metadata | null; createdAt: Date; updatedAt: Date; firstName: string; lastName: string; emailVerified: boolean; lastLoginAt: Date | null; password: string; }'.

85         return trip.organizationId === user.organizationId;
                                               ~~~~~~~~~~~~~~

server/src/trips/services/trip.service.ts:2:15 - error TS2305: Module '"../../../db/schema.js"' has no exported member 'Trip'.

2 import type { Trip, User } from '../../../db/schema.js';
                ~~~~

server/src/trips/services/trip.service.ts:21:11 - error TS2416: Property 'getTripById' in type 'TripServiceImpl' is not assignable to the same property in base type 'TripService'.
  Type '(tripId: string, user: { id: string; email: string; role: "admin" | "user" | "super_admin"; metadata: Metadata | null; createdAt: Date; updatedAt: Date; firstName: string; lastName: string; emailVerified: boolean; lastLoginAt: Date | null; password: string; }) => Promise<...>' is not assignable to type '(tripId: string, user: ServiceUser) => Promise<any>'.
    Types of parameters 'user' and 'user' are incompatible.
      Type 'ServiceUser' is missing the following properties from type '{ id: string; email: string; role: "admin" | "user" | "super_admin"; metadata: Metadata | null; createdAt: Date; updatedAt: Date; firstName: string; lastName: string; emailVerified: boolean; lastLoginAt: Date | null; password: string; }': metadata, lastLoginAt, password

21     async getTripById(tripId: string, user: User): Promise<Trip | null> {
             ~~~~~~~~~~~

server/src/trips/trip.container.ts:3:28 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

3 import { TripModule } from './trip.module.ts';
                             ~~~~~~~~~~~~~~~~~~

server/src/trips/trip.container.ts:4:32 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

4 import { TripController } from './controllers/trip.controller.ts';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/trips/trip.container.ts:5:33 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

5 import { TripServiceImpl } from './services/trip.service.ts';
                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

server/src/types/middleware.ts:2:15 - error TS2305: Module '"./express.js"' has no exported member 'User'.

2 import type { User } from './express.js';
                ~~~~

server/src/types/middleware.ts:15:7 - error TS2717: Subsequent property declarations must have the same type.  Property 'organizationId' must be of type 'string | null | undefined', but here has type 'string | undefined'.

15       organizationId?: string;
         ~~~~~~~~~~~~~~

  server/src/express-augmentations.d.ts:53:7
    53       organizationId?: string | null;
             ~~~~~~~~~~~~~~
    'organizationId' was also declared here.

server/src/utils/error-utils.ts:60:20 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.

60 import logger from './logger.ts';
                      ~~~~~~~~~~~~~

server/utils/redis.ts:2:24 - error TS6307: File '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/utils/logger.ts' is not listed within the file list of project '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/tsconfig.json'. Projects must list all files or use an 'include' pattern.
  The file is in the program because:
    Imported via './logger.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/utils/redis.ts'
    Imported via '../../../utils/logger.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/src/auth/jwt/utils.ts'
    Imported via '../../../utils/logger.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/src/auth/services/auth.service.ts'
    Imported via '../../../utils/logger.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/src/auth/repositories/refresh-token.repository.ts'
    Imported via '../../../utils/logger.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/src/auth/repositories/user.repository.ts'
    Imported via '../../../utils/logger.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/src/common/repositories/base.repository.ts'
    Imported via '../utils/logger.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/db/redis.ts'
    Imported via './logger.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/utils/secureJwt.ts'
    Imported via '../utils/logger.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/middleware/secureAuth.ts'
    Imported via '../../utils/logger.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/src/auth/auth.service.ts'
    Imported via '../../../../utils/logger.js' from file '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/src/common/repositories/user/user.repository.ts'
  File is ECMAScript module because '/mnt/c/Users/jbirc/Desktop/nestlein/nestmaprepo/server/package.json' has field "type" with value "module"

2 import { logger } from './logger.js';
                         ~~~~~~~~~~~~~

  server/src/auth/jwt/utils.ts:5:24
    5 import { logger } from '../../../utils/logger.js';
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  server/src/auth/services/auth.service.ts:15:24
    15 import { logger } from '../../../utils/logger.js';
                              ~~~~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  server/src/auth/repositories/refresh-token.repository.ts:2:24
    2 import { logger } from '../../../utils/logger.js';
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  server/src/auth/repositories/user.repository.ts:3:24
    3 import { logger } from '../../../utils/logger.js';
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  server/src/common/repositories/base.repository.ts:1:24
    1 import { logger } from '../../../utils/logger.js';
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  server/db/redis.ts:3:24
    3 import { logger } from '../utils/logger.js';
                             ~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  server/utils/secureJwt.ts:5:24
    5 import { logger } from './logger.js';
                             ~~~~~~~~~~~~~
    File is included via import here.
  server/middleware/secureAuth.ts:19:24
    19 import { logger } from '../utils/logger.js';
                              ~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  server/src/auth/auth.service.ts:12:20
    12 import logger from '../../utils/logger.js';
                          ~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  server/src/common/repositories/user/user.repository.ts:2:24
    2 import { logger } from '../../../../utils/logger.js';
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.

server/utils/secureJwt.ts:58:9 - error TS2532: Object is possibly 'undefined'.

58       ? this.parseTimeString(expiresIn) * 1000
           ~~~~

server/utils/secureJwt.ts:133:7 - error TS2741: Property 'valid' is missing in type '{ payload: T; expired: false; }' but required in type 'TokenVerificationResult<T>'.

133       return {
          ~~~~~~

  shared/dist/src/types/auth/jwt.d.ts:49:5
    49     valid: boolean;
           ~~~~~
    'valid' is declared here.

server/utils/secureJwt.ts:148:9 - error TS2741: Property 'valid' is missing in type '{ payload: T; expired: true; error: string; }' but required in type 'TokenVerificationResult<T>'.

148         return {
            ~~~~~~

  shared/dist/src/types/auth/jwt.d.ts:49:5
    49     valid: boolean;
           ~~~~~
    'valid' is declared here.

server/utils/secureJwt.ts:214:3 - error TS2300: Duplicate identifier 'expiresAt'.

214   expiresAt: Date;
      ~~~~~~~~~

server/utils/secureJwt.ts:215:5 - error TS2300: Duplicate identifier 'expiresAt'.

215     expiresAt: Date;
        ~~~~~~~~~


Found 1177 errors.