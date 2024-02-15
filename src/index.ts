// cannister code goes here
import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, Variant, text, Err, Ok } from 'azle';
import { v4 as uuidv4 } from 'uuid';


/**
 * This type represents a message that can be listed on a board
 */

type Activity = Record<{
    id: string;
    activityType: string;  /* The type of the activity. Can be "post" or "event". */
    description: string;
    date: string;   /* Date in format YYYY-MM-DD */
    time: string;   /* Time in format HH:MM */
    duration: string; /* Duration in minutes */
    participants: Vec<Participant>; /* List of participant names (comma separated) */
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type Participant = Record<{
    id:  string;
    name: string;
}>


type ActivityPayload = Record <{
    activityType: string;
    description: string;
    date: string;
    time: string;
    duration: string;
}>

const Errors = Variant({
    InvalidInput: text,
    RequestCompletionError: text
});
type Errors = typeof Errors.tsType;

const activityStorage = new StableBTreeMap <string, Activity>(0, 44, 512);
const  participantStorage = new StableBTreeMap <string, Participant>(1, 44, 512);

function isValidDate(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateString)) {
          return false;
      }
    return true;
}

function isValidDuration(durationString: string): boolean {
    const duration = parseInt(durationString);
        if (isNaN(duration) || duration <= 0) {
            return false;
        }
    return true;
}

// Create a new  activity
$update
export function addActivity(payload: ActivityPayload): Result<Activity, Errors> {
    // validate the payload to check if it exists
    if  (!payload.activityType || !payload.description || !payload.date || !payload.time || !payload.duration) {
        return Result.Err({InvalidInput: "Invalid Payload"});
    }

    if (!isValidDate(payload.date) || !isValidDuration(payload.duration)) {
        return Result.Err({InvalidInput: "Invalid date or duration format."});
    }
    
    try {
        const newActivity: Activity = {
            id: uuidv4(),
            activityType:  payload.activityType,
            description: payload.description,
            date: payload.date,
            time: payload.time,
            duration: payload.duration,
            participants: [],
            createdAt: ic.time(),
            updatedAt: Opt.None

        };
        activityStorage.insert(newActivity.id, newActivity);
        return Result.Ok(newActivity);
        
    } catch (error) {
        return Result.Err({RequestCompletionError: `Error while adding activity`});
    }
}


// Update already available activity
$update
export function updateActivity(id: string, payload: ActivityPayload): Result<Activity, Errors> {
    return match(activityStorage.get(id), {
        Some: (activity) => {
            const updateActivity: Activity = {...activity, ...payload, updatedAt: Opt.Some(ic.time())};
            activityStorage.insert(activity.id, updateActivity);
            return Result.Ok(updateActivity);
        },
        None: () => Result.Err({RequestCompletionError: `No such activity found with given Id ${id}`}),
    });
}


//  Delete the activity from storage
$update
export function deleteActivity(id: string): Result<Activity, Errors>{
    return  match(activityStorage.get(id), {
        Some: (activity) => {
            activityStorage.remove(id);
            return Result.Ok(activity);
        },
        None: ()=>Result.Err({RequestCompletionError: `There is no activity with id :${id}`}),
    });
}


//  Get all activities or get a specific activity by its id
$query
export function getActivity(id: string): Result<Activity, Errors>{
    return match(activityStorage.get(id), {
        Some: (goal) => {
            return Result.Ok(goal);
        },
        None: ( )=> Result.Err({RequestCompletionError: `No Activities Found with id :${id}`}),
    });
}


// Get all the activities
$query
export function  getAllActivities(): Vec<Activity> {
    const Activities = activityStorage.values();
    return Activities;
}


// Search the activity by tittle
$query
export function searchActivity(type: string): Result<Vec<Activity>, Errors> {
    const  filteredActvities = type.toLowerCase();
    try {
        const  foundActivity = activityStorage.values().filter(
            (activity) =>
            activity.activityType.toLowerCase().includes(filteredActvities)
            );
            return Result.Ok(foundActivity); 
    }
    catch (err){
       return Result.Err({RequestCompletionError: "Error while searching for this Activity"});
    };
}


// Create the new participant
$update
export function createNewParticipant(name: string): Result<Participant, Errors> {
    if (!name) {
        return Result.Err({InvalidInput: 'Name cannot be empty'});
    }
    try {
        const newParticipant: Participant = {
            id: uuidv4(),
            name: name,
        }
        participantStorage.insert(newParticipant.id, newParticipant);
        return Result.Ok(newParticipant);
    } catch (err) {
        return Result.Err({RequestCompletionError: `Failed to create a new participant: ${err}`});
    }
}


// Updating an Existing Participant
$update
export function updateExistingParticipant(id: string, name: string): Result<Participant,Errors> {
    return match(participantStorage.get(id), {
        Some: (participant) => {
            const  updatedParticipant: Participant = {...participant, name};
            participantStorage.insert(participant.id, updatedParticipant);
            return Result.Ok(updatedParticipant)
        },
        None: ()=> Result.Err({RequestCompletionError: `No participant with ID "${id}" exists.`}),
    });
}


// Delete an existing particpant
$update
export function deleteParticipant(id: string): Result<Participant, Errors> {
    return match(participantStorage.get(id),{
        Some: (participant) => {
            participantStorage.remove(id);
            return Result.Ok<Participant, Errors>(participant)
        },
        None: () => Result.Err<Participant, Errors>({RequestCompletionError: `Unable to find participant with ID "${id}".`}),
    });
}   

// Get a participant by id
$query
export function getParticipantById(id: string): Result<Participant, Errors> {
    return match(participantStorage.get(id), {
        Some: (participant) => {
            return Result.Ok<Participant, Errors>(participant)
        },
        None: () => Result.Err<Participant, Errors>({RequestCompletionError: "The requested participant does not exist."}),
    });
}


// Get all the participants
$query
export  function getAllParticipants(): Vec<Participant> {
    const participants = participantStorage.values();
    return participants;
}

// Insert a participant into an activity
$update
export function insertParticipantIntoActivity(activityId: string, participantId: string): Result<Activity, Errors> {
    return match(activityStorage.get(activityId), {
        Some: (activity) => {
            return match(participantStorage.get(participantId), {
                Some: (participantData) => {
                    const updateActivity: Activity = {
                        ...activity,
                        participants: [...activity.participants, participantData],
                        updatedAt: Opt.Some(ic.time()),
                    };
                    activityStorage.insert(activity.id, updateActivity);
                    return Result.Ok<Activity, Errors>(updateActivity);
                },
                None: () => Result.Err<Activity, Errors>({RequestCompletionError: `No participant found with the id "${participantId}"`})
            });
        },
        None: () => Result.Err<Activity, Errors>({RequestCompletionError: "The provided activity ID does not exist."}),
    });
}


// Deleting a participant from the data
$update
export function removeParticipantFromActivity(activityId: string, participantId: string): Result<Activity, Errors> {
    return match(activityStorage.get(activityId), {
        Some: (activity) => {
            const updateActivity: Activity = {
                ...activity,
                participants: activity.participants.filter((participant) => participant.id !== participantId),
                updatedAt: Opt.Some(ic.time()) ,
            };
            activityStorage.insert(activity.id, updateActivity);
            return Result.Ok<Activity, Errors>(updateActivity);
        },
        None: ()  => Result.Err<Activity, Errors>({RequestCompletionError: "The provided activity id was not found in our records."})
    });
}



// Configuring UUID package
globalThis.crypto = {
    // @ts-ignore
   getRandomValues: () => {
       let array = new Uint8Array(32)

       for (let i = 0; i < array.length; i++) {
           array[i] = Math.floor(Math.random() * 256)
       }

       return array
   }
}
