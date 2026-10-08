export default interface ISecretsRc {
    files: {
        name: string;
        description: string;
    }[];
    secrets: {
        name: string;
        type: "string" | "number" | "boolean";
        default: string | number | boolean;
        description: string;
    }[]
}