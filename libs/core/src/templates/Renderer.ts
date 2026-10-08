import { hbs } from './hbs';
import * as path from 'path';
import * as fs from 'fs';



export type RendererDelegate = HandlebarsTemplateDelegate;

export default class Renderer {
  private relativePath: string;
  private compiledTemplate: HandlebarsTemplateDelegate;

  constructor(relativePath: string) {
    this.relativePath = relativePath;
    const fullPath = path.join(__dirname, this.relativePath)

    if (!fs.existsSync(fullPath)) {
      console.error('Error trying to get the template file')
      console.debug({
        relative_path: this.relativePath,
        full_path: fullPath
      })
    }

    const rawContent = fs.readFileSync(fullPath).toString('utf-8')
    this.compiledTemplate = hbs.compile(rawContent)
  }

  render(substitutions: object): string {
    return this.compiledTemplate(substitutions);
  }
} 