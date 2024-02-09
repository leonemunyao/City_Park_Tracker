// cannister code goes here
import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt } from 'azle';
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


const activityStorage = new StableBTreeMap <string, Activity>(0, 44, 512);
const  participantStorage = new StableBTreeMap <string, Participant>(1, 44, 512);


// Create a new  activity
$update
export function addActivity(payload: ActivityPayload): Result<Activity, string> {
    // validate the payload to check if it exists
    if  (!payload.activityType || !payload.description || !payload.date || !payload.time || !payload.duration) {
        return Result.Err<Activity, string>("Invalid Payload");
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
        return Result.Err<Activity, string>(`Error while adding activity`);
    }
}


// Update already available activity
$update
export function updateActivity(id: string, payload: ActivityPayload): Result<Activity, string> {
    return match(activityStorage.get(id), {
        Some: (activity) => {
            const updateActivity: Activity = {...activity, ...payload, updatedAt: Opt.Some(ic.time())};
            activityStorage.insert(activity.id, updateActivity);
            return Result.Ok<Activity, string>(updateActivity);
        },
        None: () => Result.Err<Activity, string>(`No such activity found with given Id ${id}`),
    });
}


//  Delete the activity from storage
$update
export function deleteActivity(id: string): Result<Activity, string>{
    return  match(activityStorage.get(id), {
        Some: (activity) => {
            activityStorage.remove(id);
            return Result.Ok<Activity, string>(activity);
        },
        None: ()=>Result.Err<Activity, string>(`There is no activity with id :${id}`),
    });
}


//  Get all activities or get a specific activity by its id
$query
export function getActivity(id: string): Result<Activity, string>{
    return match(activityStorage.get(id), {
        Some: (goal) => {
            return Result.Ok<Activity, string>(goal);
        },
        None: ( )=> Result.Err<Activity, string>(`No Activities Found with id :${id}`),
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
export function searchActivity(type: string): Result<Vec<Activity>, string> {
    const  filteredActvities = type.toLowerCase();
    try {
        const  foundActivity = activityStorage.values().filter(
            (activity) =>
            activity.activityType.toLowerCase().includes(filteredActvities)
            );
            return Result.Ok<Vec<Activity>, string>(foundActivity); 
    }
    catch (err){
       return Result.Err("Error while searching for this Activity");
    };
}


// Create the new participant
$update
export function createNewParticipant(name: string): Result<Participant, string> {
    if (!name) {
        return Result.Err<Participant, string>('Name cannot be empty');
    }
    try {
        const newParticipant: Participant = {
            id: uuidv4(),
            name: name,
        }
        participantStorage.insert(newParticipant.id, newParticipant);
        return Result.Ok<Participant, string>(newParticipant);
    } catch (err) {
        return Result.Err<Participant, string>(`Failed to create a new participant: ${err}`);
    }
}