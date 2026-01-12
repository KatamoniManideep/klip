
export function parseTimeToSeconds(t:string):number{
    let parts = t.split(":").map(Number);

    if(parts.some(isNaN)) return -1;

    if(parts.length ===3){
        const [h,m,s] = parts;
        return h*3600 + m*60 +s;
    }

    if(parts.length === 2){
        const[m,s] =parts;
        return m*60 +s;
    }

    if(parts.length === 1){
        return parts[0];
    }

    return -1;
}