import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import FolderItem from 'App/Models/FolderItem'
import Project from 'App/Models/Project'

export default class ProjectsController {
  public async get ({ params }: HttpContextContract) {
    if (params.id !== undefined) {
      const project = await Project.findOrFail(params.id)

      return project
    }

    const projects = await Project.all()

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      date: project.createdAt,
    }))
  }

  public async post () {
    const trx = await Database.transaction()

    try {
      // Create root folder of project
      const folder = new FolderItem().useTransaction(trx)

      folder.fill({
        name: 'Root',
        type: 'folder',
      })

      await folder.save()

      // Create the project itself
      const project = new Project().useTransaction(trx)

      project.name = 'Project'
      project.rootFolder = folder.id

      await project.save()

      await trx.commit()

      return project
    } catch (error) {
      trx.rollback()
      console.log(error)
      throw error
    }
  }
}
