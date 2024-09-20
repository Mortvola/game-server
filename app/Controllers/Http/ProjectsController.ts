import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Project from 'App/Models/Project'

export default class ProjectsController {
  public async get ({ params }: HttpContextContract) {
    const project = await Project.findOrFail(params.id)

    return project
  }
}
